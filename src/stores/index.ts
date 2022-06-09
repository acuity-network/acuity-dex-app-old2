import { defineStore } from 'pinia'

export const main = defineStore('main', {
  state: () => ({
		activeAcu: "",
		accountsAcu: [],
    addressesAcu: [],
    activeEth: "",
    endpoints: {},
    chains: {},
  }),
  getters: {
  },
  actions: {
		activeAcuSet(account: String) {
			this.activeAcu = account;
		},
		accountsAcuSet(accounts: any[]) {
			this.accountsAcu = [];
      this.addressesAcu = [];

      for (let account of accounts) {
          this.accountsAcu.push({text: account.meta.name, value: account.address});
          this.addressesAcu.push(account.address);
      }
    },
    activeEthSet(account: String) {
			this.activeEth = account;
		},
    endpointsSet(endpoints) {
      this.endpoints = {};

      for (let endpoint of endpoints) {
        this.endpoints[endpoint] = {};
      }
    },
    endpointHeightSet(endpoint, height) {
      this.endpoints[endpoint].height = height;
    },
    chainSet(chainId, label, uri) {
      this.chains[chainId] = {
        label: label,
        uri: uri,
        height: null,
      }
    },
    chainHeightSet(chainId, height) {
      this.chains[chainId].height = height;
    }
  },
})
