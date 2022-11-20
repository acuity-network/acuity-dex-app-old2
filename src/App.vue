<script setup lang="ts">
import { ref, inject, onMounted, computed, watch } from 'vue'
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
  web3ListRpcProviders,
  web3UseRpcProvider
} from '@polkadot/extension-dapp';

import Splash from './components/Splash.vue'

import { main } from './stores/index'

const drawer = ref(false);
const store = main();

const menu = ref([
  {
    to: '/',
    icon: 'mdi-connection',
    text: 'Chains',
  },
  {
    to: '/tokens',
    icon: 'mdi-circle-multiple',
    text: 'Tokens',
  },
  {
    to: '/active-account',
    icon: 'mdi-account',
    text: 'Account',
  },
  {
    to: '/goto',
    icon: 'mdi-account-arrow-right',
    text: 'Goto',
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
    </v-navigation-drawer>
    <v-app-bar app>
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      </template>
      <v-app-bar-title>Acuity DEX {{ store.acuBlockNumber }}</v-app-bar-title>
    </v-app-bar>
    <v-main>
      <v-container class="pt-0 pb-0">
        <v-row class="pt-0">
          <v-col cols="12" lg="10" class="pt-0">
            <v-alert type="warning" variant="outlined" icon="mdi-test-tube">Acuity DEX is undergoing beta testing. Don't attempt any large trades.<br />
            Join the <a target="_blank" href="https://t.me/Acuity_Trading">Acuity Trading</a> Telegram group.</v-alert>
          </v-col>
        </v-row>
      </v-container>
      <splash></splash>
      <router-view v-if="store.loaded"></router-view>
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
