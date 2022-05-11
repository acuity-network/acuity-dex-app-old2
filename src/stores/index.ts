import { defineStore } from 'pinia'

export const main = defineStore('main', {
  state: () => ({
		activeAcu: "",
		accountsAcu: [],
    addressesAcu: [],
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
  },
})
