import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3'
import { main } from '@/stores/index.ts'

import sellAbi from '@/lib/contracts/AcuityAtomicSwapSell.abi.json'
import buyAbi from '@/lib/contracts/AcuityAtomicSwapBuy.abi.json'

export default class EthClient {
	web3: any;
  formatWei: any;
  atomicSwapSell: any;
  atomicSwapBuy: any;

	async init() {
    // This function detects most providers injected at window.ethereum
    const provider: any = await detectEthereumProvider();
		let store = main();

    if (provider) {
      this.web3 = new Web3(provider);
  		this.web3.eth.defaultBlock = 'pending';
  		this.web3.eth.transactionConfirmationBlocks = 1;
      this.formatWei = (wei: string) => Number(this.web3.utils.fromWei(this.web3.utils.toBN(wei))).toLocaleString();

      this.atomicSwapSell = new this.web3.eth.Contract(sellAbi, '0xd05647dd9D7B17aBEBa953fbF2dc8D8e87c19cb3');
  		this.atomicSwapBuy = new this.web3.eth.Contract(buyAbi, '0x744Ac7bbcFDDA8fdb41cF55c020d62f2109887A5');

      window.ethereum.on('accountsChanged', (accounts: any) => {
				store.activeEthSet(accounts[0]);
      });

      let accounts = await this.web3.eth.requestAccounts();
				store.activeEthSet(accounts[0]);
    } else {
      console.log('Please install MetaMask!');
    }

		return this;
  }
}
