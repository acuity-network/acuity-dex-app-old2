<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
  web3ListRpcProviders,
  web3UseRpcProvider
} from '@polkadot/extension-dapp';

const drawer = ref(false);

const menu = ref([
  {
    to: '/goto',
    icon: 'mdi-feature-search',
    text: 'Goto',
  },
  {
    to: '/orders',
    icon: 'mdi-feature-search',
    text: 'Orders',
  },
]);

let $acuityClient = inject('$acuityClient');
let $ethClient = inject('$ethClient');

const blockNumber = ref(0)

onMounted(async () => {
  $acuityClient.api.rpc.chain.subscribeNewHeads((lastHeader: any) => {
    blockNumber.value = lastHeader.number.toString();
  });
})

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
