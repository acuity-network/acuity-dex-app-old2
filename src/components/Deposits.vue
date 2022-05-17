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
const ethToDeposit = ref("");
const ethToWithdraw = ref("");

let emitter;

async function load() {
  eth.value = $ethClient.formatWei(await $ethClient.atomicSwapSell.methods.getDepositValue("0x0000000000000000000000000000000", store.activeEth).call());
}

onMounted(async () => {

  emitter = $ethClient.testnet1.atomicSwapSell.events.allEvents()
	.on('data', async (log: any) => {
    load();
  });

  load();
})

async function deposit(event) {
  $ethClient.atomicSwapSell.methods
    .deposit("0x0000000000000000000000000000000")
    .send({from: store.activeEth, value: $ethClient.web3.utils.toWei(ethToDeposit.value)});
}

async function withdraw(event) {
  $ethClient.atomicSwapSell.methods
    .withdraw("0x0000000000000000000000000000000", $ethClient.web3.utils.toWei(ethToWithdraw.value))
    .send({from: store.activeEth});
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <div class="text-h6">ETH Deposit</div>
        <p class="mb-10">{{ eth }}</p>
        <v-text-field v-model="ethToDeposit" label="ETH to deposit"></v-text-field>
        <v-btn class="mb-10" @click="deposit">Deposit</v-btn>
        <v-text-field v-model="ethToWithdraw" label="ETH to withdraw"></v-text-field>
        <v-btn class="mb-10" @click="withdraw">Withdraw</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
