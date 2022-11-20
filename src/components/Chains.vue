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

const eth = ref("");

let emitter;

const ethChains: Ref<any[]> = ref([]);
const chainId = ref(null);
const uri = ref("");

onMounted(async () => {
  for (let chainId in $ethClient.chainsData) {
    if ($ethClient.chainsData[parseInt(chainId)]['disabled']) {
      continue;
    }
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
  uri.value = "";
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

  if (uri.value.startsWith('ws://') || uri.value.startsWith('wss://')) {
    $ethClient.addChainWS(chainId.value, uri.value);
  }
  else {
    $ethClient.addChainRPC(chainId.value, uri.value);
  }
}

async function deleteChain(chainId: number) {
  $ethClient.removeChain(chainId);
}

async function addMetaMask(event: any) {
  $ethClient.addChainToMetaMask(chainId.value, uri.value);
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" lg="10">
        <v-table class="mb-10">
          <thead>
            <tr>
              <th class="text-left">
                Chain
              </th>
              <th class="text-left">
                URIs
              </th>
              <th class="text-right">
                Height
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="chain in store.ethChains" :bgcolor="(chain.chainId == store.metaMaskChainId) ? '#2196f3' : ''">
              <td>{{ chain.label }}</td>
              <td>{{ chain.ws }}<br />{{ chain.rpc }}</td>
              <td class="text-right">{{ chain.height }}</td>
              <td>
                <div class="d-flex" style="gap: 1rem">
                  <v-btn icon density="comfortable" @click="deleteChain(chain.chainId)">
                    <v-icon size="small">mdi-delete</v-icon>
                  </v-btn>
                </div>
              </td>
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
                v-for="(value, endpoint) in store.endpoints"
                :key="endpoint"
              >
                <td><v-radio :key="endpoint" :value="endpoint"></v-radio></td>
                <td>{{ endpoint }}</td>
                <td class="text-right">{{ value.height }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-radio-group>
        <div class="d-flex mb-4" style="gap: 1rem">
          <v-btn @click="addChain" :disabled="uri == ''">Add to app</v-btn>
          <v-btn @click="addMetaMask" :disabled="!uri.startsWith('https://')">Add to MetaMask</v-btn>
        </div>
        <v-alert type="info" variant="outlined" icon="mdi-connection" class="mt-8">
          Add the Ethereum chains you wish to trade on.<br />
          This app requires a <b>wss://</b> URI for each chain.<br />
          Some <b>wss://</b> URIs are insufficient and a <b>https://</b> URI is also required.<br />
          MetaMask requires a <b>https://</b> URI.
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>
