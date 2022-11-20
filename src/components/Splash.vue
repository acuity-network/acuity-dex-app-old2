<script setup lang="ts">
import { ref, inject, onMounted, computed, watch} from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Buffer } from "buffer";
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
  web3ListRpcProviders,
  web3UseRpcProvider
} from '@polkadot/extension-dapp';
import { encodeAddress, decodeAddress } from '@polkadot/keyring';
import { main } from '../stores/index'

let $db: any = inject('$db');
let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();

const noPolkadot = ref(false);
const noEthereum = ref(false);

let balanceUnsub: any;

watch(() => store.activeAcu, async (newValue, oldValue) => {
  console.log("Switched to account", newValue);
  $db.put('/activeAccount', newValue);

  try {
    balanceUnsub()
  }
  catch (e) {}

  balanceUnsub = $acuityClient.api.query.system.account(newValue, (result: any) => {
    store.acuBalanceSet(newValue, $ethClient.formatWei(result.data.free));
  });

  await $ethClient.loadAccounts();
  $ethClient.loadBalances();
});


onMounted(async () => {
  let results = await Promise.all([
		$acuityClient.init(),
		$ethClient.init($db, $acuityClient),
	]);

  if (results[0] == false) {
    noPolkadot.value = true;
  }

  if (results[1] == false) {
    noEthereum.value = true;
  }

  if (results[0] == false || results[1] == false) {
    return;
  }

  store.setLoaded();

  try {
    let activeAccount = await $db.get('/activeAccount');
    store.activeAcuSet(activeAccount);
  }
  catch (e) {}

  $acuityClient.api.rpc.chain.subscribeNewHeads((lastHeader: any) => {
    store.setAcuBlockNumber(parseInt(lastHeader.number).toLocaleString());
  });

  await $ethClient.loadAccounts();
  $ethClient.loadBalances();
});

</script>

<template>
  <v-container>
    <v-alert v-if="noPolkadot" type="error" class="mb-8">Please enable <a style="color: white;" target="_blank" href="https://polkadot.js.org/extension/">Polkadot{.js}</a> browser extension to access Acuity DEX.</v-alert>
    <v-alert v-if="noEthereum" type="error" class="mb-8">Please enable an Ethereum browser extension such as <a style="color: white;" target="_blank" href="https://metamask.io/download/">MetaMask</a> to access Acuity DEX.</v-alert>
    <v-alert v-if="store.loaded && store.accountsAcu.length == 0" type="error" class="mb-8">Please create an Acuity account in the Polkadot{.js} browser extension.</v-alert>
  </v-container>
</template>
