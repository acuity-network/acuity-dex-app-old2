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

const sellSymbol = computed(() => store.sellChainId ? ethChainsData[store.sellChainId].symbol : '');
const buySymbol = computed(() => store.buyChainId ? ethChainsData[store.buyChainId].symbol : '');

const sellOrders = ref([]);


async function getAcuAddress(foreignAddress) {
  return encodeAddress(await $ethClient.chains[store.sellChainId].account.methods.getAcuAccount(foreignAddress).call());
}

async function loadName(acuAddress) {
  let result = await $acuityClient.api.query.identity.identityOf(acuAddress);
  let json = result.unwrap().info.display.toString();
  let display = JSON.parse(json);
  return $ethClient.web3.utils.hexToAscii(display.raw);
}

async function load() {
  if (!store.sellChainId || !store.buyChainId) {
    return;
  }

  if (!$ethClient.chains[store.sellChainId]) {
    return;
  }

  if (!$ethClient.chains[store.sellChainId].atomicSwap) {
    return;
  }

  let sellAssetId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.sellChainId), 32);
  let buyAssetId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.buyChainId), 32);

  let stashes = await $ethClient.chains[store.sellChainId].atomicSwap.methods.getStashes(buyAssetId, 100).call();

  sellOrders.value = [];

  for (let i in stashes.accounts) {
    let account = stashes.accounts[i];
    let acuAddress = await getAcuAddress(account);
    let stashValue = stashes.values[i];

    let result = await $acuityClient.api.query.orderbook.orderbook(acuAddress, sellAssetId, buyAssetId);

    let price = $ethClient.web3.utils.fromWei(result.price);
    let value = $ethClient.web3.utils.fromWei(result.value);
    let total = price * value;

    sellOrders.value.push({
      account: acuAddress,
      accountName: await loadName(acuAddress),
      stash: $ethClient.formatWei(stashValue),
      price: price,
      value: value,
      total: total,
    })
  }
}

onMounted(async () => {
  load();
})

watch(() => store.sellChainId, async (newValue, oldValue) => {
  load();
});

watch(() => store.buyChainId, async (newValue, oldValue) => {
  load();
});

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-select v-model="store.sellChainId" :items="chainSelect" label="Sell chain"></v-select>
        <v-select v-model="store.buyChainId" :items="chainSelect" label="Buy chain"></v-select>

        <v-table class="mb-10">
          <thead>
            <tr>
              <th class="text-left">
                Account
              </th>
              <th class="text-right">
                Stash ({{ sellSymbol }})
              </th>
              <th class="text-right">
                Price ({{ buySymbol }} / {{ sellSymbol }})
              </th>
              <th class="text-right">
                Value ({{ sellSymbol }})
              </th>
              <th class="text-right">
                Total ({{ buySymbol }})
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sellOrder in sellOrders">
              <td><router-link :to="'/account/' + sellOrder.account">{{ sellOrder.accountName }}</router-link></td>
              <td class="text-right">{{ sellOrder.stash }}</td>
              <td class="text-right">{{ sellOrder.price }}</td>
              <td class="text-right">{{ sellOrder.value }}</td>
              <td class="text-right">{{ sellOrder.total }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
</template>
