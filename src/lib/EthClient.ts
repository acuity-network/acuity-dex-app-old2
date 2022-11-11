import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3'
import { encodeAddress } from '@polkadot/keyring';
import { main } from '../stores/index'
let store: any;

import ethChainsDataJson from '../lib/eth-chains.json';
import ethChainsDataTestnetsJson from '../lib/eth-chains-testnets.json';

import accountAbiJson from '../lib/contracts/AcuityAccount.abi.json'
const accountAbi: any = accountAbiJson;

import atomicSwapAbiJson from '../lib/contracts/AcuityAtomicSwap.abi.json'
const atomicSwapAbi: any = atomicSwapAbiJson;

import atomicSwapERC20AbiJson from '../lib/contracts/AcuityAtomicSwapERC20.abi.json'
const atomicSwapERC20Abi: any = atomicSwapERC20AbiJson;

import rpcAbiJson from '../lib/contracts/AcuityRPC.abi.json'
const rpcAbi: any = rpcAbiJson;

function newEndpoint(chainId: number, uri: string) {
  let web3 = new Web3(uri);

  web3.eth.getBlockNumber()
    .then(height => {
      store.chainHeightSet(chainId, height);
    })
    .catch(() => {});

  web3.eth.subscribe('newBlockHeaders')
    .on('data', data => {
      store.chainHeightSet(chainId, data.number);
    })
    .on('error', () => {});

  return web3;
}

export default class EthClient {
  db: any;
  provider: any;
	web3: any;
  formatWei: any;
  unformatWei: any;
  account: any;
  atomicSwap: any;
  atomicSwapERC20: any;
	chains: { [key: number]: any; } = {};
  chainsData: any = import.meta.env.DEV ? ethChainsDataTestnetsJson : ethChainsDataJson;

	async init(db: any) {
    this.db = db;
    this.provider = await detectEthereumProvider();
		store = main();

    if (this.provider) {
      this.web3 = new Web3(this.provider);
  		this.web3.eth.defaultBlock = 'pending';
  		this.web3.eth.transactionConfirmationBlocks = 1;
      this.formatWei = (wei: string, decimals: number = 18) => {
        let divisor = BigInt(10) ** BigInt(decimals);
        let integer = (BigInt(wei) / divisor).toLocaleString();
        let decimal = this.web3.utils.padLeft((BigInt(wei) % divisor).toString(), decimals);
        let displayDecimals = decimal.length;

        while(displayDecimals != 0 && decimal[displayDecimals - 1] == '0') {
          displayDecimals--;
        }

        decimal = decimal.slice(0, displayDecimals);
        return integer + ((decimal == '') ? '' : ('.' + decimal));
      }

      this.unformatWei = (formatted: string, decimals: number = 18) => {
        let result = formatted.replaceAll(',', '').split('.', 2);
        let integer = result[0];
        let decimal = result[1];
        if (!decimal) decimal = '';
        if (decimal.length > decimals) return BigInt(0);

        try {
          return BigInt(integer) * (BigInt(10) ** BigInt(decimals)) + BigInt(this.web3.utils.padRight(decimal, decimals));
        }
        catch (e) {
          return BigInt(0);
        }
      }

      this.provider
        .on('chainChanged', (chainIdHex: string) => {
          let chainId = parseInt(chainIdHex, 16);
          store.metaMaskChainIdSet(chainId);
          if (this.chainsData.hasOwnProperty(chainId)) {
            this.account = new this.web3.eth.Contract(accountAbi, this.chainsData[chainId].contracts.account);
        		this.atomicSwap = new this.web3.eth.Contract(atomicSwapAbi, this.chainsData[chainId].contracts.atomicSwap);
            this.atomicSwapERC20 = new this.web3.eth.Contract(atomicSwapERC20Abi, this.chainsData[chainId].contracts.atomicSwapERC20);
          }
        })
        .on('accountsChanged', (accounts: any) => {
  				store.metaMaskAccountSet(accounts[0].toLowerCase());
        });

      let chainId = await this.web3.eth.getChainId();
      store.metaMaskChainIdSet(chainId);

      if (this.chainsData.hasOwnProperty(chainId)) {
        this.account = new this.web3.eth.Contract(accountAbi, this.chainsData[chainId].contracts.account);
    		this.atomicSwap = new this.web3.eth.Contract(atomicSwapAbi, this.chainsData[chainId].contracts.atomicSwap);
        this.atomicSwapERC20 = new this.web3.eth.Contract(atomicSwapERC20Abi, this.chainsData[chainId].contracts.atomicSwapERC20);
      }

      let accounts = await this.web3.eth.requestAccounts();
			store.metaMaskAccountSet(accounts[0].toLowerCase());

			for await (const [key, json] of this.db.iterator({
		    gt: '/chains/',
        lt: '/chains/z',
		  })) {
        try {
          let chain = JSON.parse(json);
          this.loadChain(chain);
        }
        catch (e) {}
		  }
    } else {
      console.log('Please install MetaMask!');
    }

		return this;
  }

  async loadChain(chain: any) {
    if (!this.chainsData[chain.chainId]) return;

    try {
      chain.label = this.chainsData[chain.chainId].label;
      store.ethChainSet(chain);
      if (chain.ws == '') return;

      this.chains[chain.chainId] = {
        ws: {},
        rpc: {},
      };
      let web3 = newEndpoint(chain.chainId, chain.ws);
      this.chains[chain.chainId].ws.web3 = web3;
      this.chains[chain.chainId].ws.account = new web3.eth.Contract(accountAbi, this.chainsData[chain.chainId].contracts.account);
      this.chains[chain.chainId].ws.atomicSwap = new web3.eth.Contract(atomicSwapAbi, this.chainsData[chain.chainId].contracts.atomicSwap);
      this.chains[chain.chainId].ws.atomicSwapERC20 = new web3.eth.Contract(atomicSwapERC20Abi, this.chainsData[chain.chainId].contracts.atomicSwapERC20);

      if (chain.rpc != '') {
        let web3 = newEndpoint(chain.chainId, chain.rpc);
        this.chains[chain.chainId].rpc.web3 = web3;
        this.chains[chain.chainId].rpc.account = new web3.eth.Contract(accountAbi, this.chainsData[chain.chainId].contracts.account);
        this.chains[chain.chainId].rpc.atomicSwap = new web3.eth.Contract(atomicSwapAbi, this.chainsData[chain.chainId].contracts.atomicSwap);
        this.chains[chain.chainId].rpc.atomicSwapERC20 = new web3.eth.Contract(atomicSwapERC20Abi, this.chainsData[chain.chainId].contracts.atomicSwapERC20);
        this.chains[chain.chainId].rpc.rpc = new web3.eth.Contract(rpcAbi, this.chainsData[chain.chainId].contracts.acuityRPC);
      }
      else {
        this.chains[chain.chainId].rpc = this.chains[chain.chainId].ws;
        this.chains[chain.chainId].rpc.rpc = new this.chains[chain.chainId].ws.web3.eth.Contract(rpcAbi, this.chainsData[chain.chainId].contracts.acuityRPC);
      }
    }
    catch (e) {
      console.error(e);
    }

    // Load tokens from database.
    for await (const [key, json] of this.db.iterator({
      gt: '/tokens/' + chain.chainId + '/',
      lt: '/tokens/' + chain.chainId + '/z',
    })) {
      let address = key.split('/')[3];
      let info = JSON.parse(json);

      store.tokenSet(chain.chainId, address, info);
    }
  }

  async addChainWS(chainId: number, uri: string) {
    let chain;
    try {
      chain = JSON.parse(await this.db.get('/chains/' + chainId));
    } catch (e) {
      chain = {
        chainId: chainId,
        rpc: '',
      }
    }
    chain.ws = uri;
    this.db.put('/chains/' + chainId, JSON.stringify(chain));
    this.loadChain(chain);
  }

  async addChainRPC(chainId: number, uri: string) {
    let chain: any;
    try {
      chain = JSON.parse(await this.db.get('/chains/' + chainId));
    } catch (e) {
      chain = {
        chainId: chainId,
        ws: '',
      }
    }
    chain.rpc = uri;
    this.db.put('/chains/' + chainId, JSON.stringify(chain));
    this.loadChain(chain);
  }

  async removeChain(chainId: number) {
    this.db.del('/chains/' + chainId);
    this.chains[chainId] = {};
    store.ethChainRemove(chainId);
  }

  async addChainToMetaMask(chainId: number, uri: string) {
    const params = {
      chainId: this.web3.utils.numberToHex(chainId),
      chainName: this.chainsData[chainId].label,
      nativeCurrency: {
        name: this.chainsData[chainId].label,
        symbol: this.chainsData[chainId].symbol,
        decimals: 18,
      },
      rpcUrls: [uri],
      blockExplorerUrls: (this.chainsData[chainId].explorers.length > 0) ? this.chainsData[chainId].explorers : null,
      iconUrls: [],
    };

    this.provider.request({
      method: "wallet_addEthereumChain",
      params: [params],
    })
    .catch((error: any) => {});
  }
}
