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

let $db = inject('$db');
let $acuityClient = inject('$acuityClient');
let $ethClient = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();
const chains = computed(() => store.chains);
const chainSelect = computed(() => store.chainSelect);
const metaMaskChainId = computed(() => store.metaMaskChainId);

const sellerAccountId = ref(null);
const sellerName = ref("");
const sellChainId = ref(null);
const sellChain = ref("");
const buyChainId = ref(null);
const buyChain = ref("");
const stashed = ref(null);
const price = ref(null);
const value = ref(null);
const total = ref(null);
const buyValue = ref(null);

const buyCost = computed(() => {
  if (price.value && buyValue.value) {
    return price.value * buyValue.value;
  }
});

let foreignAddress;
let priceWei;

const sellSymbol = computed(() => sellChainId.value ? ethChainsData[sellChainId.value].symbol : '');
const buySymbol = computed(() => buyChainId.value ? ethChainsData[buyChainId.value].symbol : '');

async function loadName(acuAddress) {
  let result = await $acuityClient.api.query.identity.identityOf(acuAddress);
  let json = result.unwrap().info.display.toString();
  let display = JSON.parse(json);
  return $ethClient.web3.utils.hexToAscii(display.raw);
}

onMounted(async () => {
  sellerAccountId.value = route.params.accountId;
  sellerName.value = await loadName(route.params.accountId);
  sellChainId.value = $ethClient.web3.utils.hexToNumber(route.params.sellAssetId);
  sellChain.value = ethChainsData[sellChainId.value].label;
  buyChainId.value = $ethClient.web3.utils.hexToNumber(route.params.buyAssetId);
  buyChain.value = ethChainsData[buyChainId.value].label;

  let chainIdHex = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(sellChainId.value), 16);
  let result = await $acuityClient.api.query.orderbook.accountForeignAccount(sellerAccountId.value, chainIdHex);
  foreignAddress = '0x' + Buffer.from(result).toString('hex').slice(24);

  stashed.value = $ethClient.formatWei(await $ethClient.chains[sellChainId.value].atomicSwap.methods.getStashValue(route.params.buyAssetId, foreignAddress).call());

  result = await $acuityClient.api.query.orderbook.orderbook(route.params.accountId, route.params.sellAssetId, route.params.buyAssetId);

  priceWei = result.price;
  price.value = $ethClient.web3.utils.fromWei(result.price);
  value.value = $ethClient.web3.utils.fromWei(result.value);
  total.value = price.value * value.value;

  let events = await $ethClient.chains[buyChainId.value].atomicSwap.getPastEvents('Lock', {
    fromBlock: 0
  });

  console.log(events);
});

async function createBuyLock(event) {

  let recipient = foreignAddress;
  let secret = $ethClient.web3.utils.randomHex(32);
  let hashedSecret = $ethClient.web3.utils.keccak256(secret);
  $db.put('/secrets/' + hashedSecret, secret);
  let timeout = Date.now() + 60 * 60 * 24 * 3 * 1000;
  let sellAssetIdPrice = route.params.sellAssetId + priceWei.toHex().slice(2);
  let value = $ethClient.web3.utils.fromWei((BigInt($ethClient.web3.utils.toWei(buyValue.value)) * BigInt(priceWei)).toString()).split('.')[0];

  console.log({recipient, hashedSecret, timeout, sellAssetIdPrice, value});

  $ethClient.atomicSwap.methods
    .lockValue(recipient, hashedSecret, timeout, sellAssetIdPrice)
    .send({from: store.metaMaskAccount, value: value});
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-table class="mb-10">
          <thead>
            <tr>
              <th class="text-left">
                Buyer
              </th>
              <th class="text-left">
                Buy Lock ({{ buySymbol }})
              </th>
              <th class="text-left">
                State
              </th>
              <th class="text-left">
                Timeout
              </th>
              <th class="text-left"></th>
              <th style="background-color: rgba(18, 18, 18);"></th>
              <th class="text-left">
                Sell Lock ({{ sellSymbol }})
              </th>
              <th class="text-left">
                State
              </th>
              <th class="text-left">
                Timeout
              </th>
              <th class="text-left"></th>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="10">
        <v-text-field readonly v-model="sellerName" label="Seller" hint="Who is selling." persistent-hint></v-text-field>
        <v-text-field readonly v-model="sellChain" label="Sell chain" hint="Asset being sold." persistent-hint></v-text-field>
        <v-text-field readonly v-model="buyChain" label="Buy chain" hint="Asset to pay with." persistent-hint></v-text-field>
        <v-text-field readonly v-model="stashed" label="Stashed" :suffix="sellSymbol" hint="Value seller has stashed for this pair." persistent-hint></v-text-field>
        <v-text-field readonly v-model="price" label="Price" :suffix="buySymbol + ' / ' + sellSymbol" hint="Price asset is being sold for." persistent-hint></v-text-field>
        <v-text-field readonly v-model="value" label="Value" :suffix="sellSymbol" hint="How much is for sale." persistent-hint></v-text-field>
        <v-text-field readonly v-model="total" label="Total" :suffix="buySymbol" hint="Maximum that can be paid." persistent-hint></v-text-field>
        <v-text-field v-model="buyValue" label="Buy value" :suffix="sellSymbol" hint="How much you want to buy." persistent-hint></v-text-field>
        <v-text-field readonly v-model="buyCost" label="Cost" :suffix="buySymbol" hint="Cost to buy." persistent-hint></v-text-field>
        <v-btn @click="createBuyLock" class="mt-4">Buy</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
