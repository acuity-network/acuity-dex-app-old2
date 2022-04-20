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
    to: '/about',
    icon: 'mdi-information',
    test: 'About',
  },
  {
    to: '/features',
    icon: 'mdi-feature-search',
    text: 'Features',
  },
  {
    to: '/parachains',
    icon: 'mdi-expansion-card-variant',
    text: 'Parachains',
  },
  {
    to: '/regenesis',
    icon: 'mdi-rocket-launch',
    text: 'Regenesis',
  },
  {
    to: '/acu',
    icon: 'mdi-cash-usd',
    text: 'ACU',
  },
  {
    to: '/atomic-swap',
    icon: 'mdi-atom-variant',
    text: 'Atomic Swap',
  },
  {
    to: '/roadmap',
    icon: 'mdi-timeline-text',
    text: 'Roadmap',
  },
  {
    to: '/tech-stack',
    icon: 'mdi-server-network',
    text: 'Tech Stack',
  },
  {
    to: '/blog',
    icon: 'mdi-format-quote-open',
    text: 'Blog',
  },
]);

let $acuityClient;
let $ethClient;

const blockNumber = ref(0)


onMounted(async () => {
  $acuityClient = inject('$acuityClient');
  $ethClient = inject('$ethClient');
  const allInjected = await web3Enable('Acuity Browser');
  await $acuityClient.init();
  $acuityClient.api.rpc.chain.subscribeNewHeads((lastHeader: any) => {
    blockNumber.value = lastHeader.number.toString();
  });

  await $ethClient.init();
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
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
