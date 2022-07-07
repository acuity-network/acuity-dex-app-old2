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

onMounted(async () => {
  try {
    store.activeAcuSet(await $db.get('/activeAccount'));
  }
  catch (e) {}

  $acuityClient.api.rpc.chain.subscribeNewHeads((lastHeader: any) => {
    blockNumber.value = lastHeader.number.toString();
  });
})

watch(() => store.activeAcu, async (newValue, oldValue) => {
  $db.put('/activeAccount', newValue);
});

async function onboardMetaMask(event: any) {
  const onboarding = new MetaMaskOnboarding();
  onboarding.startOnboarding();
}


</script>

<template>
  <v-app id="inspire"       theme="dark">
    <v-navigation-drawer
      v-model="drawer"
      app

    >
      <v-list density="compact">
        <v-list-item
          v-for="(item, i) in menu"
          :key="i"
          :value="item"
          :to="item.to"
        >
          <v-list-item-avatar start>
            <v-icon :icon="item.icon"></v-icon>
          </v-list-item-avatar>
          <v-list-item-title v-text="item.text"></v-list-item-title>
        </v-list-item>
      </v-list>
      <v-select v-model="store.activeAcu" :items="store.accountsAcu" label="Active account"></v-select>
      <v-btn color="rgb(3, 125, 214)" class="mt-10 mb-4" @click="onboardMetaMask">MetaMask</v-btn>
    </v-navigation-drawer>

    <v-app-bar
      density="compact"
    >
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      </template>

      <v-app-bar-title>Acuity DEX {{ blockNumber }}</v-app-bar-title>

      <template v-slot:append>
        <v-btn icon="mdi-dots-vertical"></v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <router-view></router-view>
    </v-main>
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
