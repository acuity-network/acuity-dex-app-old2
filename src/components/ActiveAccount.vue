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
let route, router;

const store = main();
const accountsAcu = computed(() => store.accountsAcu);
const addressesAcu = computed(() => store.addressesAcu);

const activeAccount = ref(store.activeAcu);
const name = ref("");

async function loadName(address) {
  let result = await $acuityClient.api.query.identity.identityOf(address);
  let json = result.unwrap().info.display.toString();
  let display = JSON.parse(json);
  return $ethClient.web3.utils.hexToAscii(display.raw);
}

async function load() {
  name.value = await loadName(activeAccount.value);
};

onMounted(async () => {
  router = useRouter();
  route = useRoute();

  load();

});

watch(activeAccount, async (newa, olda) => {
  store.activeAcuSet(activeAccount.value);
  load();
});

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">

        <v-select v-model="activeAccount" :items="addressesAcu" label="Active account"></v-select>

        <div class="text-h6">Name</div>
        <p>{{ name }}</p>

      </v-col>
    </v-row>
  </v-container>
</template>
