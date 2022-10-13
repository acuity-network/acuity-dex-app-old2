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

let $db: any = inject('$db');
let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();
const chains = computed(() => store.ethChains);
const chainSelect = computed(() => store.chainSelect);
const metaMaskChainId = computed(() => store.metaMaskChainId);

import erc20AbiJson from '../lib/contracts/ERC20.abi.json'
const erc20Abi: any = erc20AbiJson;


const allowance = ref("");
const unlimited = ref(false);
const allowanceNew = ref("");
const sellSymbol = ref("");

const allowanceWaiting = ref(false);
const allowanceDisabled = ref(false);

async function load() {

  let token = new $ethClient.chains[store.metaMaskChainId].web3.eth.Contract(erc20Abi, route.params.address);
  let contractAddress = $ethClient.chainsData[store.metaMaskChainId].contracts.atomicSwapERC20;

  let allowanceWei = await token.methods.allowance(store.metaMaskAccount, contractAddress).call();
  allowance.value = $ethClient.formatWei(allowanceWei, 18);
}

onMounted(async () => {
  let token = new $ethClient.chains[store.metaMaskChainId].web3.eth.Contract(erc20Abi, route.params.address);
  let emitter = token.events.allEvents()
  .on('data', function(event: any){
    load();
  });

  load();
})

async function approve(event: any) {
  let token = new $ethClient.web3.eth.Contract(erc20Abi, route.params.address);
  let contractAddress = $ethClient.chainsData[store.metaMaskChainId].contracts.atomicSwapERC20;
  // "0x8000000000000000000000000000000000000000000000000000000000000000"
  let allowance = unlimited.value ? "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" : allowanceNew.value;
  allowanceDisabled.value = true;
  token.methods
    .approve(contractAddress, allowance)
    .send({from: store.metaMaskAccount})
    .on('transactionHash', function(payload: any) {
      allowanceWaiting.value = true;
    })
    .on('receipt', function(receipt: any) {
      allowanceWaiting.value = false;
      allowanceDisabled.value = false;
      load();
    })
    .on('error', function(error: any) {
      console.error(error);
      allowanceWaiting.value = false;
      allowanceDisabled.value = false;
    });
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-text-field v-model="store.metaMaskChainName" label="Chain" readonly hint="Select in MetaMask." persistent-hint></v-text-field>
        <v-text-field label="Token"></v-text-field>
        <v-text-field v-model="allowance" label="Allowance" readonly></v-text-field>

        <v-card class="mb-10">
          <v-toolbar color="blue">
            <v-toolbar-title>Approve allowance</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-checkbox v-model="unlimited" label="Unlimited"></v-checkbox>
            <v-text-field v-model="allowanceNew" label="Value" :suffix="sellSymbol" :disabled="allowanceDisabled || unlimited"></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="success" @click="approve" :disabled="allowanceDisabled">Approve</v-btn>
          </v-card-actions>
          <v-progress-linear :indeterminate="allowanceWaiting" color="yellow darken-2"></v-progress-linear>
        </v-card>

      </v-col>
    </v-row>
  </v-container>
</template>
