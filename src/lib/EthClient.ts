import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3'
import { main } from '../stores/index'
let store: any;

import ethChainsDataJson from '../lib/eth-chains.json'
const ethChainsData: any = ethChainsDataJson;

import accountAbiJson from '../lib/contracts/AcuityAccount.abi.json'
const accountAbi: any = accountAbiJson;

import atomicSwapAbiJson from '../lib/contracts/AcuityAtomicSwap.abi.json'
const atomicSwapAbi: any = atomicSwapAbiJson;

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
	web3: any;
  formatWei: any;
  account: any;
  atomicSwap: any;
	chains: { [key: number]: any; } = {};

	async init($db: any) {
    // This function detects most providers injected at window.ethereum
    const provider: any = await detectEthereumProvider();
		store = main();

    if (provider) {
      this.web3 = new Web3(provider);
  		this.web3.eth.defaultBlock = 'pending';
  		this.web3.eth.transactionConfirmationBlocks = 1;
      this.formatWei = (wei: string) => Number(this.web3.utils.fromWei(this.web3.utils.toBN(wei))).toLocaleString();

      (window.ethereum as any)
        .on('chainChanged', (chainIdHex: string) => {
          let chainId = parseInt(chainIdHex, 16);
          store.metaMaskChainIdSet(chainId);
          this.account = new this.web3.eth.Contract(accountAbi, ethChainsData[chainId].contracts.account);
      		this.atomicSwap = new this.web3.eth.Contract(atomicSwapAbi, ethChainsData[chainId].contracts.atomicSwap);
        })
        .on('accountsChanged', (accounts: any) => {
  				store.metaMaskAccountSet(accounts[0]);
        });

      let chainId = await this.web3.eth.getChainId();
      store.metaMaskChainIdSet(chainId);
      this.account = new this.web3.eth.Contract(accountAbi, ethChainsData[chainId].contracts.account);
  		this.atomicSwap = new this.web3.eth.Contract(atomicSwapAbi, ethChainsData[chainId].contracts.atomicSwap);

      let accounts = await this.web3.eth.requestAccounts();
			store.metaMaskAccountSet(accounts[0]);

			for await (const [key, uri] of $db.iterator({
		    gt: '/chains/'
		  })) {
		    let chainId = parseInt(key.slice(8));

				if (Number.isInteger(chainId)) {
					store.chainSet(chainId, ethChainsData[chainId].label, uri);
					let web3 = newEndpoint(chainId, uri);
					this.chains[chainId] = {};
					this.chains[chainId].web3 = web3;
          if (ethChainsData[chainId].contracts.account) {
				    this.chains[chainId].account = new web3.eth.Contract(accountAbi, ethChainsData[chainId].contracts.account);
          }
          if (ethChainsData[chainId].contracts.atomicSwap) {
  					this.chains[chainId].atomicSwap = new web3.eth.Contract(atomicSwapAbi, ethChainsData[chainId].contracts.atomicSwap);
          }
	//				this.chains[chainId].atomicSwapERC20 =
				}
		  }
    } else {
      console.log('Please install MetaMask!');
    }

		return this;
  }
}
