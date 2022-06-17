<script setup lang="ts">
import { ref, inject, onMounted, computed, watch} from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
  web3ListRpcProviders,
  web3UseRpcProvider
} from '@polkadot/extension-dapp';
import { encodeAddress } from '@polkadot/keyring';
import { main } from '@/stores/index.ts'

import ethChainsData from '@/lib/eth-chains.json'

let $acuityClient = inject('$acuityClient');
let $ethClient = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();
const chains = computed(() => store.chains);
const chainSelect = computed(() => store.chainSelect);
const metaMaskChainId = computed(() => store.metaMaskChainId);

const chainIdSell = ref(null);
const chainIdBuy = ref(null);


async function load() {
}

onMounted(async () => {
})

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-select v-model="chainIdSell" :items="chainSelect" label="Sell chain"></v-select>
        <v-select v-model="chainIdBuy" :items="chainSelect" label="Buy chain"></v-select>
      </v-col>
    </v-row>
  </v-container>
</template>
