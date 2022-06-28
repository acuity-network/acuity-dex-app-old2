<script setup lang="ts">
import { ref, inject, onMounted, computed, watch} from 'vue'
import type { Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
  web3ListRpcProviders,
  web3UseRpcProvider
} from '@polkadot/extension-dapp';
import { encodeAddress } from '@polkadot/keyring';
import { main } from '../stores/index'

import ethChainsDataJson from '../lib/eth-chains.json'
const ethChainsData: any = ethChainsDataJson;

let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();
const chains = computed(() => store.chains);
const chainSelect = computed(() => store.chainSelect);
const metaMaskChainId = computed(() => store.metaMaskChainId);

let sellAssetId: any = computed(() => $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.metaMaskChainId), 32));
let buyAssetId = computed(() => $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.buyChainId), 32));

const eth = ref(null);
const ethToStash = ref("");
const ethToWithdraw = ref("");

const sellSymbol = computed(() => ethChainsData[metaMaskChainId.value].symbol);
const buySymbol = computed(() => store.buyChainId ? ethChainsData[store.buyChainId].symbol : '');

const sellValue = ref(null);
const sellPrice = ref(null);
const sellTotal = computed(() => (sellValue.value ?? 0) * (sellPrice.value ?? 0));


let emitter;


async function load() {

  if ($ethClient.chains[metaMaskChainId.value].atomicSwap) {
    try {
      eth.value = $ethClient.formatWei(await $ethClient.chains[metaMaskChainId.value].atomicSwap.methods.getStashValue(buyAssetId.value, store.metaMaskAccount).call());
    }
    catch (e) {};
  }

  let result = await $acuityClient.api.query.orderbook.orderbook(store.activeAcu, sellAssetId.value, buyAssetId.value);

  sellPrice.value = $ethClient.web3.utils.fromWei(result.price);
  sellValue.value = $ethClient.web3.utils.fromWei(result.value);
}

onMounted(async () => {
  emitter = $ethClient.chains[metaMaskChainId.value].atomicSwap.events.allEvents()
  .on('data', async (log: any) => {
    load();
  });
  load();
})

watch(metaMaskChainId, async (newValue, oldValue) => {
  if ($ethClient.chains[newValue].atomicSwap) {
    emitter = $ethClient.chains[newValue].atomicSwap.events.allEvents()
  	.on('data', async (log: any) => {
      load();
    });
  }

  load();
});

watch(() => store.buyChainId, async (newValue, oldValue) => {
  load();
});

async function deposit(event: any) {
  $ethClient.atomicSwap.methods
    .depositStash(buyAssetId.value)
    .send({from: store.metaMaskAccount, value: $ethClient.web3.utils.toWei(ethToStash.value)});
}

async function withdraw(event: any) {
  $ethClient.atomicSwap.methods
    .withdrawStash(buyAssetId.value, $ethClient.web3.utils.toWei(ethToWithdraw.value))
    .send({from: store.metaMaskAccount});
}

async function set(event: any) {
  const injector = await web3FromAddress(store.activeAcu);
  let price = $ethClient.web3.utils.toWei(sellPrice.value);
  let value = $ethClient.web3.utils.toWei(sellValue.value);

  $acuityClient.api.tx.orderbook
    .setOrder(sellAssetId.value, buyAssetId.value, price, value)
    .signAndSend(store.activeAcu, { signer: injector.signer }, (status: any) => {
      console.log(status)
    });
}

async function reset(event: any) {
  load();
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-select readonly v-model="metaMaskChainId" :items="chainSelect" label="Sell chain"></v-select>
        <v-select v-model="store.buyChainId" :items="chainSelect" label="Buy chain"></v-select>
        <div class="text-h6">{{ sellSymbol }} Stashed</div>
        <p class="mb-10">{{ eth }}</p>
        <v-text-field v-model="ethToStash" label="Value to stash" :suffix="sellSymbol"></v-text-field>
        <v-btn class="mb-10" @click="deposit">Stash</v-btn>
        <v-text-field v-model="ethToWithdraw" label="Value to withdraw" :suffix="sellSymbol"></v-text-field>
        <v-btn class="mb-10" @click="withdraw">Withdraw</v-btn>
        <div class="text-h6 mb-10">Sell order</div>
        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="sellPrice" label="Price" :suffix="buySymbol + ' / ' + sellSymbol"></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="sellValue" label="Value" :suffix="sellSymbol"></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="sellTotal" readonly label="Total" :suffix="buySymbol"></v-text-field>
          </v-col>
        </v-row>
        <div class="d-flex" style="gap: 1rem">
          <v-btn @click="set">Set</v-btn>
          <v-btn @click="reset">Reset</v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>
