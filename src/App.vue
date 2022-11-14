<script setup lang="ts">
import { ref, inject, onMounted, computed, watch } from 'vue'
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
  web3ListRpcProviders,
  web3UseRpcProvider
} from '@polkadot/extension-dapp';
import MetaMaskOnboarding from '@metamask/onboarding';

const drawer = ref(false);

import { main } from './stores/index'
const store = main();

const menu = ref([
  {
    to: '/',
    icon: 'mdi-account',
    text: 'Account',
  },
  {
    to: '/goto',
    icon: 'mdi-account-arrow-right',
    text: 'Goto',
  },
  {
    to: '/chains',
    icon: 'mdi-connection',
    text: 'Chains',
  },
  {
    to: '/tokens',
    icon: 'mdi-circle-multiple',
    text: 'Tokens',
  },
  {
    to: '/buy',
    icon: 'mdi-cart-arrow-down',
    text: 'Buy',
  },
  {
    to: '/sell',
    icon: 'mdi-cart-arrow-up',
    text: 'Sell',
  },
]);

let $db: any = inject('$db');
let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');

const blockNumber = ref(0)

let balanceUnsub: any;

onMounted(async () => {
  $acuityClient.api.rpc.chain.subscribeNewHeads((lastHeader: any) => {
    blockNumber.value = lastHeader.number.toString();
  });

  try {
    let activeAccount = await $db.get('/activeAccount');
    store.activeAcuSet(activeAccount);
  }
  catch (e) {}

  $ethClient.loadBalances();
})

watch(() => store.activeAcu, async (newValue, oldValue) => {
  console.log("Switched to account", newValue);
  $db.put('/activeAccount', newValue);

  try {
    balanceUnsub()
  }
  catch (e) {}

  balanceUnsub = $acuityClient.api.query.system.account(newValue, (result: any) => {
    store.acuBalanceSet(newValue, $ethClient.formatWei(result.data.free));
  });

  $ethClient.loadBalances();
});

async function onboardMetaMask(event: any) {
  const onboarding = new MetaMaskOnboarding();
  onboarding.startOnboarding();
}

</script>

<template>
  <v-app theme="dark">
    <v-navigation-drawer v-model="drawer" app>
      <v-list density="compact">
        <v-list-item
          v-for="(item, i) in menu"
          :key="i"
          :value="item"
          :to="item.to"
        >
          <template v-slot:prepend>
            <v-icon :icon="item.icon"></v-icon>
          </template>
          <v-list-item-title v-text="item.text"></v-list-item-title>
        </v-list-item>
      </v-list>
      <v-select v-model="store.activeAcu" :items="store.accountsAcu" label="Acuity account"></v-select>
      <v-text-field v-model="store.acuBalance[store.activeAcu]" label="Balance" suffix="ACU" readonly></v-text-field>

      <v-list density="compact">
        <v-list-item
          v-for="chain in store.ethChains"
          :key="chain.chainId"
          :title="chain.label"
        >
        <template v-if="store.acuAccountForeignAccount[chain.chainId] && store.chainBalance[chain.chainId]">
          <v-text-field
            v-model="store.chainBalance[chain.chainId][store.acuAccountForeignAccount[chain.chainId][store.activeAcu]]"
            :suffix="$ethClient.chainsData[chain.chainId].symbol"
            readonly
          ></v-text-field>

          <template v-if="store.tokens[chain.chainId] && store.tokenBalance[chain.chainId]">
            <template v-for="(token, address) in store.tokens[chain.chainId]">
              <v-text-field
                v-if="store.tokenBalance[chain.chainId][address]"
                v-model="store.tokenBalance[chain.chainId][address][store.acuAccountForeignAccount[chain.chainId][store.activeAcu]]"
                :suffix="token.symbol"
                readonly
              ></v-text-field>
            </template>
          </template>
        </template>
        </v-list-item>
      </v-list>

      <v-btn block color="rgb(227, 126, 6)" class="my-2" target="_blank" href="https://polkadot.js.org/extension/">polkadot{.js}</v-btn>
      <v-btn block color="rgb(3, 125, 214)" class="my-2" @click="onboardMetaMask">MetaMask</v-btn>
    </v-navigation-drawer>
    <v-app-bar app>
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      </template>
      <v-app-bar-title>Acuity DEX {{ blockNumber }}</v-app-bar-title>
    </v-app-bar>
    <v-main>
      <v-container class="pt-0">
        <v-row class="pt-0" >
          <v-col cols="12" md="10" class="pt-0">
            <v-alert type="info">Acuity DEX is undergoing beta testing. Don't attempt any large trades.<br />
            Join the <a style="color: white;" target="_blank" href="https://t.me/Acuity_Trading">Acuity Trading</a> Telegram group.</v-alert>
          </v-col>
        </v-row>
      </v-container>
      <router-view></router-view>
    </v-main>
    <v-footer app>
    </v-footer>
  </v-app>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
