<script setup lang="ts">
import { ref, inject, onMounted, computed, watch } from 'vue'
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
import Web3 from 'web3'

import { main } from '../stores/index'

let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();
const endpoints = computed(() => store.endpoints);
const chains = computed(() => store.chains);

const eth = ref("");
const ethToStash = ref("");
const ethToWithdraw = ref("");

let emitter;

const ethChains: Ref<any[]> = ref([]);
const chainId = ref(null);
const uri = ref("");

onMounted(async () => {
  for (let chainId in $ethClient.chainsData) {
    ethChains.value.push({
      value: parseInt(chainId),
      title: $ethClient.chainsData[parseInt(chainId)].label,
    });
  }
})

let endpointsWeb3: any = {};

function newEndpoint(uri: string) {
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
  let chainId: number = newValue ?? 0;
  store.endpointsSet($ethClient.chainsData[chainId].rpcs);
/*
  for (let web3 of Object.entries(endpointsWeb3)) {
    try {
      web3.currentProvider.connection.close();
    }
    catch (error) {};
  }
*/
  endpointsWeb3 = {};

  for (let i in $ethClient.chainsData[chainId].rpcs) {
    endpointsWeb3[$ethClient.chainsData[chainId].rpcs[i]] = newEndpoint($ethClient.chainsData[chainId].rpcs[i]);
  }
});

async function addChain(event: any) {
  $ethClient.addChain(chainId.value, uri.value);
}

async function deleteChain(chainId: number) {
  $ethClient.removeChain(chainId);
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
              <th>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="chain in chains">
              <td>{{ chain.label }}</td>
              <td>{{ chain.uri }}</td>
              <td class="text-right">{{ chain.height }}</td>
              <td><v-icon @click="deleteChain(chain.chainId)" size="small">mdi-delete</v-icon></td>
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
        <v-btn class="mb-10" @click="addChain">Add chain</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
