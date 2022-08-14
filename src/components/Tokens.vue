<script setup lang="ts">
import { ref, reactive, inject, onMounted, computed, watch } from 'vue'
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

let $db: any = inject('$db');
let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let route = useRoute();
let router = useRouter();

import erc20AbiJson from '../lib/contracts/ERC20.abi.json'
const erc20Abi: any = erc20AbiJson;

const store = main();
const endpoints = computed(() => store.endpoints);
const chains = computed(() => store.ethChains);

const tokenAddress = ref("");
const tokenAddresses: Ref<any[]> = ref([]);

const tokens: Ref<any[]> = ref([]);

async function load() {

  let newTokens = [];

    for await (const [key, json] of $db.iterator({
    gt: '/tokens/' + route.params.chainId + '/',
    lt: '/tokens/' + route.params.chainId + '/z',
  })) {
    let address = key.split('/')[3];
    let info = JSON.parse(json);

    newTokens.push({
      symbol: info.symbol,
      name: info.name,
      address: address,
    })
  }

  tokens.value = newTokens;

  for (let address in $ethClient.chainsData[parseInt(route.params.chainId as string)].tokens) {
    tokenAddresses.value.push({
      value: address,
      title: $ethClient.chainsData[parseInt(route.params.chainId as string)].tokens[address],
    });
  }
}

onMounted(async () => {
  load();
})

async function addToken(event: any) {
  let token = new $ethClient.chains[parseInt(route.params.chainId as string)].web3.eth.Contract(erc20Abi, tokenAddress.value);

  let result = await Promise.all([
    token.methods.name().call(),
    token.methods.symbol().call(),
    token.methods.decimals().call(),
  ]);

  let info = {
    name: result[0],
    symbol: result[1],
    decimals: result[2],
  }

  await $db.put('/tokens/' + route.params.chainId + '/' + tokenAddress.value, JSON.stringify(info));
  load();
}

async function removeToken(address: string) {
  await $db.del('/tokens/' + route.params.chainId + '/' + address);
  load();
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
                Code
              </th>
              <th class="text-left">
                Name
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="token in tokens">
              <td>{{ token.symbol }}</td>
              <td>{{ token.name }}</td>
              <td>
                <div class="d-flex" style="gap: 1rem">
                  <v-btn icon density="comfortable" @click="removeToken(token.address)">
                    <v-icon size="small">mdi-delete</v-icon>
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-select
          v-model="tokenAddress"
          :items="tokenAddresses"
          label="Token name"
        ></v-select>
        <v-text-field
          v-model="tokenAddress"
          label="Token address"
        ></v-text-field>
        <v-btn @click="addToken">Add token</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
