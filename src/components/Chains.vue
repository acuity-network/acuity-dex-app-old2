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
import Web3 from 'web3'

import { main } from '@/stores/index.ts'

let $acuityClient = inject('$acuityClient');
let $ethClient = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();
const endpoints = computed(() => store.endpoints);

const eth = ref("");
const ethToStash = ref("");
const ethToWithdraw = ref("");

let emitter;

import ethChainsData from '@/lib/eth-chains.json'

const ethChains = ref([]);

const chain = ref(null);

async function load() {
}

/*
let endpoints = [];
let endpointsTable = ref([]);
*/

onMounted(async () => {

  for (let chainId in ethChainsData) {
    ethChains.value.push({
      value: chainId,
      title: ethChainsData[chainId].label,
    });
  }

  load();
})

let endpointsWeb3 = {}

function newEndpoint(uri) {
  let web3 = new Web3(uri);

  web3.eth.getBlockNumber()
    .then(height => {
      store.endpointHeightSet(uri, height);
    })
    .catch(() => {});

  web3.eth.subscribe('newBlockHeaders')
    .on('data', data => {
      store.endpointHeightSet(uri, data.number);
    })
    .on('error', () => {});

  return web3;
}

watch(chain, async (newValue, oldValue) => {
  store.endpointsSet(ethChainsData[newValue].rpcs);

  for (let web3 of Object.entries(endpointsWeb3)) {
    try {
      web3.currentProvider.connection.close();
    }
    catch (error) {};
  }

  endpointsWeb3 = {};

  for (let i in ethChainsData[newValue].rpcs) {
    endpointsWeb3[ethChainsData[newValue].rpcs[i]] = newEndpoint(ethChainsData[newValue].rpcs[i]);
  }

/*
  let block = await web3.eth.getBlock(0);
  console.log(block.hash);
*/

});


</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-select
          v-model="chain"
          :items="ethChains"
          label="Chain to add"
        ></v-select>
        <v-table>
          <thead>
            <tr>
              <th class="text-left">
                URI
              </th>
              <th class="text-left">
                Height
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(value, endpoint) in endpoints"
              :key="endpoint"
            >
              <td>{{ endpoint }}</td>
              <td>{{ value.height }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
</template>
