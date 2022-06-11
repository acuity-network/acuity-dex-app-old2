import { defineStore } from 'pinia'

export const main = defineStore('main', {
  state: () => ({
		activeAcu: "",
		accountsAcu: [],
    addressesAcu: [],
    metamaskChainId: null,
    metamaskAccount: null,
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
    metamaskChainIdSet(chainId) {
			this.metamaskChainId = chainId;
      console.log("MetaMask switched to chainId", chainId);
		},
    metamaskAccountSet(account: String) {
			this.metamaskAccount = account;
      console.log("MetaMask switched to account", account);
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
