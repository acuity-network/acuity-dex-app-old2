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

const account = ref("");

async function goto(event) {
  router.push('/account/' + account.value);
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-text-field v-model="account" label="Goto account"></v-text-field>
        <v-btn @click="goto">Goto</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
