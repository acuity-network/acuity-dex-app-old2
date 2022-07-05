import { defineStore } from 'pinia'

export const main = defineStore('main', {
  state: () => ({
		activeAcu: "" as string,
		accountsAcu: [] as any[],
    addressesAcu: [] as string[],
    metaMaskChainId: 0 as number,
    metaMaskAccount: "" as string,
    sellChainId: 0 as number,
    buyChainId: 0 as number,
    endpoints: {} as any,
    chains: {} as any,
    chainSelect: [] as any[],
    foreignAccountAcuAccount: {} as any,
    acuAccountForeignAccount: {} as any,
  }),
  getters: {
  },
  actions: {
		activeAcuSet(account: string) {
			this.activeAcu = account;
		},
		accountsAcuSet(accounts: any[]) {
			this.accountsAcu = [];
      this.addressesAcu = [];

      for (let account of accounts) {
          this.accountsAcu.push({title: account.meta.name, value: account.address});
          this.addressesAcu.push(account.address);
      }
    },
    metaMaskChainIdSet(chainId: number) {
			this.metaMaskChainId = chainId;
      console.log("MetaMask switched to chainId", chainId);
		},
    metaMaskAccountSet(account: string) {
			this.metaMaskAccount = account;
      console.log("MetaMask switched to account", account);
		},
    sellChainIdSet(chainId: number) {
      this.sellChainId = chainId;
    },
    buyChainIdSet(chainId: number) {
      this.buyChainId = chainId;
    },
    endpointsSet(endpoints: string[]) {
      this.endpoints = {};

      for (let endpoint of endpoints) {
        this.endpoints[endpoint] = {};
      }
    },
    endpointHeightSet(endpoint: string, height: number) {
      this.endpoints[endpoint].height = height;
    },
    chainSet(chainId: number, label: string, uri: string) {
      if (!(chainId in this.chains)) {
        this.chainSelect.push({
          value: chainId,
          title: label,
        });
      }
      this.chains[chainId] = {
        chainId: chainId,
        label: label,
        uri: uri,
        height: null,
      };
    },
    chainRemove(chainId: number, label: string, uri: string) {
      delete this.chains[chainId];

      for (let i in this.chainSelect) {
        if (this.chainSelect[i].value == chainId) {
          delete this.chainSelect[i];
          break;
        }
      }
    },
    chainHeightSet(chainId: number, height: number) {
      this.chains[chainId].height = height;
    },
    foreignAccountAcuAccountSet(chainId: number, foreignAccount: string, acuAccount: string) {
      this.foreignAccountAcuAccount[chainId] = {};
      this.foreignAccountAcuAccount[chainId][foreignAccount] = acuAccount;
    },
    acuAccountForeignAccountSet(chainId: number, acuAccount: string, foreignAccount: string) {
      this.acuAccountForeignAccount[chainId] = {};
      this.acuAccountForeignAccount[chainId][acuAccount] = foreignAccount;
    },
  },
})
