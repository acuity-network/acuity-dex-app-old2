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

const eth = ref(null);
const ethToStash = ref("");
const ethToWithdraw = ref("");

const sellSymbol = computed(() => ethChainsData[metaMaskChainId.value].symbol);
const buySymbol = computed(() => chainIdBuy.value ? ethChainsData[chainIdBuy.value].symbol : '');

const sellValue = ref(null);
const sellPrice = ref(null);
const sellTotal = computed(() => sellValue.value * sellPrice.value);


let emitter;


async function load() {

  if ($ethClient.chains[metaMaskChainId.value].atomicSwap) {
    try {
      eth.value = $ethClient.formatWei(await $ethClient.chains[metaMaskChainId.value].atomicSwap.methods.getStashValue("0x0000000000000000000000000000000", store.metaMaskAccount).call());
    }
    catch (e) {};
  }

  let sellAssetId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.metaMaskChainId), 32);
  let buyAssetId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(chainIdBuy.value), 32);

  let result = await $acuityClient.api.query.orderbook.orderbook(store.activeAcu, sellAssetId, buyAssetId);

  sellPrice.value = $ethClient.web3.utils.fromWei(result.price);
  sellValue.value = $ethClient.web3.utils.fromWei(result.value);
}

onMounted(async () => {
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

watch(chainIdBuy, async (newValue, oldValue) => {
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

async function set(event) {
  const injector = await web3FromAddress(store.activeAcu);
  let sellAssetId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.metaMaskChainId), 32);
  let buyAssetId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(chainIdBuy.value), 32);
  let price = $ethClient.web3.utils.toWei(sellPrice.value);
  let value = $ethClient.web3.utils.toWei(sellValue.value);
  console.log({sellAssetId, buyAssetId, price, value});
  $acuityClient.api.tx.orderbook
    .setOrder(sellAssetId, buyAssetId, price, value)
    .signAndSend(store.activeAcu, { signer: injector.signer }, (status: any) => {
      console.log(status)
    });
}

async function reset(event) {
  load();
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-select readonly v-model="metaMaskChainId" :items="chainSelect" label="Sell chain"></v-select>
        <v-select v-model="chainIdBuy" :items="chainSelect" label="Buy chain"></v-select>
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
