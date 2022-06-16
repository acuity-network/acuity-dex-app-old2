import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3'
import { main } from '@/stores/index.ts'
let store;

import ethChainsData from '@/lib/eth-chains.json'
import accountAbi from '@/lib/contracts/AcuityAccount.abi.json'
import atomicSwapAbi from '@/lib/contracts/AcuityAtomicSwap.abi.json'

function newEndpoint(chainId, uri) {
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
  atomicSwapSell: any;
  atomicSwapBuy: any;
	chains: { [key: number]: any; } = {};

	async init($db) {
    // This function detects most providers injected at window.ethereum
    const provider: any = await detectEthereumProvider();
		store = main();

    if (provider) {
      this.web3 = new Web3(provider);
  		this.web3.eth.defaultBlock = 'pending';
  		this.web3.eth.transactionConfirmationBlocks = 1;
      this.formatWei = (wei: string) => Number(this.web3.utils.fromWei(this.web3.utils.toBN(wei))).toLocaleString();

      this.account = new this.web3.eth.Contract(accountAbi, '0xd05647dd9D7B17aBEBa953fbF2dc8D8e87c19cb3');
  		this.atomicSwap = new this.web3.eth.Contract(atomicSwapAbi, '0x744Ac7bbcFDDA8fdb41cF55c020d62f2109887A5');

      window.ethereum
        .on('chainChanged', (chainId: String) => {
          store.metaMaskChainIdSet(parseInt(chainId, 16));
        })
        .on('accountsChanged', (accounts: any) => {
  				store.metaMaskAccountSet(accounts[0]);
        });

      store.metaMaskChainIdSet(await this.web3.eth.getChainId());
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
