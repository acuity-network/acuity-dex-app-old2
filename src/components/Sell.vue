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

const chainIdBuy = ref(null);

const eth = ref("");
const ethToStash = ref("");
const ethToWithdraw = ref("");

const sellSymbol = ref("");

let emitter;

async function load() {
  eth.value = $ethClient.formatWei(await $ethClient.chains[metaMaskChainId.value].atomicSwap.methods.getStashValue("0x0000000000000000000000000000000", store.metaMaskAccount).call());
}

onMounted(async () => {
  load();
})

watch(metaMaskChainId, async (newValue, oldValue) => {
  sellSymbol.value = ethChainsData[newValue].symbol;
  emitter = $ethClient.chains[metaMaskChainId.value].atomicSwap.events.allEvents()
	.on('data', async (log: any) => {
    load();
  });

  load();
});

async function deposit(event) {
  $ethClient.atomicSwap.methods
    .depositStash("0x0000000000000000000000000000000")
    .send({from: store.metaMaskAccount, value: $ethClient.web3.utils.toWei(ethToStash.value)});
}

async function withdraw(event) {
  $ethClient.atomicSwap.methods
    .withdrawStash("0x0000000000000000000000000000000", $ethClient.web3.utils.toWei(ethToWithdraw.value))
    .send({from: store.metaMaskAccount});
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-select v-model="metaMaskChainId" :items="chainSelect" label="Sell chain"></v-select>
        <v-select v-model="chainIdBuy" :items="chainSelect" label="Buy chain"></v-select>
        <div class="text-h6">{{ sellSymbol }} Stashed</div>
        <p class="mb-10">{{ eth }}</p>
        <v-text-field v-model="ethToStash" :label="sellSymbol + ' to stash'"></v-text-field>
        <v-btn class="mb-10" @click="deposit">Stash</v-btn>
        <v-text-field v-model="ethToWithdraw" :label="sellSymbol + ' to withdraw'"></v-text-field>
        <v-btn class="mb-10" @click="withdraw">Withdraw</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
