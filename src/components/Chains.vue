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

let $acuityClient = inject('$acuityClient');
let $ethClient = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();

const eth = ref("");
const ethToStash = ref("");
const ethToWithdraw = ref("");

let emitter;

import ethChainsData from '@/lib/eth-chains.json'

const ethChains = ref([]);

const chain = ref(0);

const rpcs = ref([]);

async function load() {
}

onMounted(async () => {

  for (let chainId in ethChainsData) {
    ethChains.value.push({
      value: chainId,
      title: ethChainsData[chainId].label,
    });
  }

  load();
})

watch(chain, async (newValue, oldValue) => {
  rpcs.value = ethChainsData[newValue].rpcs;
  console.log(rpcs.value);
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
                RPC
              </th>
              <th class="text-left">
                Active
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rpc in rpcs"
              :key="rpc"
            >
              <td>{{ rpc }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
</template>
