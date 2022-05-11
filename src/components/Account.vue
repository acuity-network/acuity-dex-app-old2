<script setup lang="ts">
import { ref, inject, onMounted, computed} from 'vue'
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

const name = ref("");
const trusted = ref(false);
const trusts = ref([]);
const trustedThatTrust = ref([]);

async function trust(event) {
  const injector = await web3FromAddress(store.activeAcu);
  $acuityClient.api.tx.trustedAccounts
    .trustAccount(route.params.id)
    .signAndSend(store.activeAcu, { signer: injector.signer }, (status: any) => {
      console.log(status)
    });
}

async function untrust(event) {
  const injector = await web3FromAddress(store.activeAcu);
  $acuityClient.api.tx.trustedAccounts
    .untrustAccount(route.params.id)
    .signAndSend(store.activeAcu, { signer: injector.signer }, (status: any) => {
      console.log(status)
    });
}

async function loadName(address) {
  let result = await $acuityClient.api.query.identity.identityOf(route.params.id);
  let json = result.unwrap().info.display.toString();
  let display = JSON.parse(json);
  return $ethClient.web3.utils.hexToAscii(display.raw);
}

async function load() {

  name.value = await loadName(route.params.id);

  trusted.value = await $acuityClient.api.rpc.trustedAccounts.isTrusted(store.activeAcu, route.params.id);

  let result = await $acuityClient.api.rpc.trustedAccounts.trustedBy(route.params.id);
  trusts.value = [];
  for (let account of result) {
    let address = encodeAddress(account);
    trusts.value.push({
      text: await loadName(address),
      to: address,
    })
  }

  result = await $acuityClient.api.rpc.trustedAccounts.trustedByThatTrust(store.activeAcu, route.params.id);
  trustedThatTrust.value = [];
  for (let account of result) {
    let address = encodeAddress(account);
    trustedThatTrust.value.push({
      text: await loadName(address),
      address: address,
    })
  }
}

onMounted(async () => {
  router = useRouter();
  route = useRoute();

  load();

  $acuityClient.api.query.system.events((events) => {

    // Loop through the Vec<EventRecord>
    events.forEach((record) => {

      // Extract the phase, event and the event types
      const { event, phase } = record;
      const types = event.typeDef;

      if (event.section == 'trustedAccounts') {
/*
        // Show what we are busy with
        console.log(
          `\t${event.section}:${event.method}:: (phase=${phase.toString()})`
        );
  //      console.log(`\t\t${event.meta.documentation.toString()}`);

        // Loop through each of the parameters, displaying the type and data
        event.data.forEach((data, index) => {
          console.log(`\t\t\t${types[index].type}: ${data.toString()}`);
        });
*/
        load();

      }
    });
  });
})


</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">

        <div class="text-h6">Name</div>
        <p>{{ name }}</p>

        <div class="text-h6">Address</div>
        <p>{{ $route.params.id }}</p>

        <div class="text-h6">Trusted by me</div>
        <p>{{ trusted }}</p>

        <div class="text-h6">Trusts</div>

        <v-list density="compact">
          <v-list-item
            v-for="(item, i) in trusts"
            :key="i"
            :value="item"
            :to="item.to"
          >
            <v-list-item-title v-text="item.text"></v-list-item-title>
          </v-list-item>
        </v-list>

        <div class="text-h6">Trusted that trust</div>

        <v-list density="compact">
          <v-list-item
            v-for="(item, i) in trustedThatTrust"
            :key="i"
            :value="item"
          >
            <v-list-item-title v-text="item.text"></v-list-item-title>
          </v-list-item>
        </v-list>

        <v-btn v-if="trusted == true" @click="untrust">Untrust</v-btn>
        <v-btn v-else @click="trust">Trust</v-btn>

      </v-col>
    </v-row>
  </v-container>
</template>
