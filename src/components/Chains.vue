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

async function load() {
}

onMounted(async () => {

  load();
})


</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
      </v-col>
    </v-row>
  </v-container>
</template>
