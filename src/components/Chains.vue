<script setup lang="ts">
import { ref, inject, onMounted, computed, watch } from 'vue'
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
let $db = inject('$db');
let route = useRoute();
let router = useRouter();

const store = main();
const endpoints = computed(() => store.endpoints);
const chains = computed(() => store.chains);

const eth = ref("");
const ethToStash = ref("");
const ethToWithdraw = ref("");

let emitter;

import ethChainsData from '@/lib/eth-chains.json'

const ethChains = ref([]);
const chainId = ref(null);
const uri = ref("");

onMounted(async () => {
  for (let chainId in ethChainsData) {
    ethChains.value.push({
      value: chainId,
      title: ethChainsData[chainId].label,
    });
  }
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

watch(chainId, async (newValue, oldValue) => {
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


});

async function add(event) {
  $db.put('/chains/' + chainId.value, uri.value);
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
                Chain
              </th>
              <th class="text-left">
                URI
              </th>
              <th class="text-right">
                Height
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="chain in chains">
              <td>{{ chain.label }}</td>
              <td>{{ chain.uri }}</td>
              <td class="text-right">{{ chain.height }}</td>
            </tr>
          </tbody>
        </v-table>
        <v-select
          v-model="chainId"
          :items="ethChains"
          label="Chain to add"
        ></v-select>
        <v-radio-group v-model="uri">
          <v-table>
            <thead>
              <tr>
                <th>
                </th>
                <th class="text-left">
                  URI
                </th>
                <th class="text-right">
                  Height
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(value, endpoint) in endpoints"
                :key="endpoint"
              >
                <td><v-radio :key="endpoint" :value="endpoint"></v-radio></td>
                <td>{{ endpoint }}</td>
                <td class="text-right">{{ value.height }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-radio-group>
        <v-btn class="mb-10" @click="add">Add chain</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
