import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3'
import { main } from '@/stores/index.ts'

import accountAbi from '@/lib/contracts/AcuityAccount.abi.json'
import atomicSwapAbi from '@/lib/contracts/AcuityAtomicSwap.abi.json'

export default class EthClient {
	web3: any;
  formatWei: any;
  atomicSwapSell: any;
  atomicSwapBuy: any;

	testnet1: any;
	testnet2: any;

	async init() {
    // This function detects most providers injected at window.ethereum
    const provider: any = await detectEthereumProvider();
		let store = main();

    if (provider) {
      this.web3 = new Web3(provider);
  		this.web3.eth.defaultBlock = 'pending';
  		this.web3.eth.transactionConfirmationBlocks = 1;
      this.formatWei = (wei: string) => Number(this.web3.utils.fromWei(this.web3.utils.toBN(wei))).toLocaleString();

      this.account = new this.web3.eth.Contract(accountAbi, '0xd05647dd9D7B17aBEBa953fbF2dc8D8e87c19cb3');
  		this.atomicSwap = new this.web3.eth.Contract(atomicSwapAbi, '0x744Ac7bbcFDDA8fdb41cF55c020d62f2109887A5');

      window.ethereum.on('accountsChanged', (accounts: any) => {
				store.activeEthSet(accounts[0]);
      });

      let accounts = await this.web3.eth.requestAccounts();
			store.activeEthSet(accounts[0]);

			this.testnet1 = {};
			this.testnet1.web3 = new Web3("ws://localhost:8546");
			this.testnet1.account = new this.testnet1.web3.eth.Contract(accountAbi, '0xd05647dd9D7B17aBEBa953fbF2dc8D8e87c19cb3');
  		this.testnet1.atomicSwap = new this.testnet1.web3.eth.Contract(atomicSwapAbi, '0x744Ac7bbcFDDA8fdb41cF55c020d62f2109887A5');

			this.testnet2 = {};
			this.testnet2.web3 = new Web3("ws://localhost:8548");
			this.testnet2.account = new this.testnet2.web3.eth.Contract(accountAbi, '0xd05647dd9D7B17aBEBa953fbF2dc8D8e87c19cb3');
  		this.testnet2.atomicSwap = new this.testnet2.web3.eth.Contract(atomicSwapAbi, '0x744Ac7bbcFDDA8fdb41cF55c020d62f2109887A5');
    } else {
      console.log('Please install MetaMask!');
    }

		return this;
  }
}
