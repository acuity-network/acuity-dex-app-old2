import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3'
import { encodeAddress } from '@polkadot/keyring';
import { main } from '../stores/index'
let store: any;

import ethChainsDataJson from '../lib/eth-chains-testnets.json'

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
  chainsData: any = ethChainsDataJson;

  async loadAcuAccount() {
    if (this.chains.hasOwnProperty(store.metaMaskChainId)) {
      let mappedAcuAddress = encodeAddress(await this.chains[store.metaMaskChainId].account.methods.getAcuAccount(store.metaMaskAccount).call());
      store.activeAcuSet(mappedAcuAddress);
    }
  }

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
        let result = formatted.split('.', 2);
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

      (window.ethereum as any)
        .on('chainChanged', (chainIdHex: string) => {
          let chainId = parseInt(chainIdHex, 16);
          store.metaMaskChainIdSet(chainId);
          if (this.chainsData.hasOwnProperty(chainId)) {
            this.account = new this.web3.eth.Contract(accountAbi, this.chainsData[chainId].contracts.account);
        		this.atomicSwap = new this.web3.eth.Contract(atomicSwapAbi, this.chainsData[chainId].contracts.atomicSwap);
            this.atomicSwapERC20 = new this.web3.eth.Contract(atomicSwapERC20Abi, this.chainsData[chainId].contracts.atomicSwapERC20);
          }
          this.loadAcuAccount();
        })
        .on('accountsChanged', (accounts: any) => {
  				store.metaMaskAccountSet(accounts[0].toLowerCase());
          this.loadAcuAccount();
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

			for await (const [key, uri] of this.db.iterator({
		    gt: '/chains/',
        lt: '/chains/z',
		  })) {
		    let chainId = parseInt(key.slice(8));

				if (Number.isInteger(chainId)) {
          this.loadChain(chainId, uri);
				}
		  }

      await this.loadAcuAccount();
    } else {
      console.log('Please install MetaMask!');
    }

		return this;
  }

  async loadChain(chainId: number, uri: string) {
    store.ethChainSet(chainId, this.chainsData[chainId].label, uri);
    try {
      let web3 = newEndpoint(chainId, uri);
      this.chains[chainId] = {};
      this.chains[chainId].web3 = web3;
      if (this.chainsData[chainId].contracts.account) {
        this.chains[chainId].account = new web3.eth.Contract(accountAbi, this.chainsData[chainId].contracts.account);
      }
      if (this.chainsData[chainId].contracts.atomicSwap) {
        this.chains[chainId].atomicSwap = new web3.eth.Contract(atomicSwapAbi, this.chainsData[chainId].contracts.atomicSwap);
      }
      if (this.chainsData[chainId].contracts.atomicSwapERC20) {
        this.chains[chainId].atomicSwapERC20 = new web3.eth.Contract(atomicSwapERC20Abi, this.chainsData[chainId].contracts.atomicSwapERC20);
      }
      if (this.chainsData[chainId].contracts.acuityRPC) {
        this.chains[chainId].rpc = new web3.eth.Contract(rpcAbi, this.chainsData[chainId].contracts.acuityRPC);
      }
    }
    catch (e) {}

    // Load tokens from database.
    for await (const [key, json] of this.db.iterator({
      gt: '/tokens/' + chainId + '/',
      lt: '/tokens/' + chainId + '/z',
    })) {
      let address = key.split('/')[3];
      let info = JSON.parse(json);

      store.tokenSet(chainId, address, info);
    }
  }

  async addChain(chainId: number, uri: string) {
    this.db.put('/chains/' + chainId, uri);
    this.loadChain(chainId, uri);
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
