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

let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();

const name = ref("");
const telegram = ref("");
const trusted = ref(false);
const trustsMe = ref(false);
const trusts: Ref<any[]> = ref([]);
const trustedThatTrust: Ref<any[]> = ref([]);
const disabled = ref(false);
const waiting = ref(false);

async function trust(event: any) {
  disabled.value = true;
  const injector = await web3FromAddress(store.activeAcu);
  try {
    const unsub = await $acuityClient.api.tx.trustedAccounts
      .trustAccount(route.params.id)
      .signAndSend(store.activeAcu, { signer: injector.signer }, ({ status, events }: any) => {
        if (!status.isInBlock) {
          waiting.value = true;
        }
        else {
          unsub();
          events
            // find/filter for failed events
            .filter(({ event }: any) =>
              $acuityClient.api.events.system.ExtrinsicFailed.is(event)
            )
            // we know that data for system.ExtrinsicFailed is
            // (DispatchError, DispatchInfo)
            .forEach(({ event: { data: [error, info] } }: any) => {
              if (error.isModule) {
                // for module errors, we have the section indexed, lookup
                const decoded = $acuityClient.api.registry.findMetaError(error.asModule);
                const { docs, method, section } = decoded;

                store.errorSet(`${section}.${method}: ${docs.join(' ')}`);
              } else {
                // Other, CannotLookup, BadOrigin, no extra info
                store.errorSet(error.toString());
              }
            });
          waiting.value = false;
          disabled.value = false;
        }
      });
  }
  catch (e) {
    waiting.value = false;
    disabled.value = false;
  }
}

async function untrust(event: any) {
  disabled.value = true;
  const injector = await web3FromAddress(store.activeAcu);
  try {
    const unsub = await $acuityClient.api.tx.trustedAccounts
      .untrustAccount(route.params.id)
      .signAndSend(store.activeAcu, { signer: injector.signer }, ({ status, events }: any) => {
        if (!status.isInBlock) {
          waiting.value = true;
        }
        else {
          unsub();
          events
            // find/filter for failed events
            .filter(({ event }: any) =>
              $acuityClient.api.events.system.ExtrinsicFailed.is(event)
            )
            // we know that data for system.ExtrinsicFailed is
            // (DispatchError, DispatchInfo)
            .forEach(({ event: { data: [error, info] } }: any) => {
              if (error.isModule) {
                // for module errors, we have the section indexed, lookup
                const decoded = $acuityClient.api.registry.findMetaError(error.asModule);
                const { docs, method, section } = decoded;

                store.errorSet(`${section}.${method}: ${docs.join(' ')}`);
              } else {
                // Other, CannotLookup, BadOrigin, no extra info
                store.errorSet(error.toString());
              }
            });
          waiting.value = false;
          disabled.value = false;
        }
      });
  }
  catch (e) {
    waiting.value = false;
    disabled.value = false;
  }
}

async function loadName(address: string): Promise<string> {
  try {
    let result = await $acuityClient.api.query.identity.identityOf(address);
    let json = result.unwrap().info.display.toString();
    let display = JSON.parse(json);
    return $ethClient.web3.utils.hexToAscii(display.raw);
  }
  catch (e) {
    return 'unknown';
  }
}

watch(() => route.params.id, async (newValue, oldValue) => {
  load();
});

watch(() => store.activeAcu, async (newValue, oldValue) => {
  load();
});

async function load() {

  name.value = '';
  telegram.value = '';

  try {
    let result = await $acuityClient.api.query.identity.identityOf(route.params.id as string);
    let info = result.unwrap().info;
    try {
      name.value = $ethClient.web3.utils.hexToAscii(JSON.parse(info.display.toString()).raw);
    }
    catch (e) {}
    try {
      telegram.value  = $ethClient.web3.utils.hexToAscii(JSON.parse(info.additional.toString())[0][1].raw);
    }
    catch (e) {}
  }
  catch (e) {}

  trusted.value = await $acuityClient.api.rpc.trustedAccounts.isTrusted(store.activeAcu, route.params.id);

  trustsMe.value = await $acuityClient.api.rpc.trustedAccounts.isTrusted(route.params.id, store.activeAcu);

  let result = await $acuityClient.api.rpc.trustedAccounts.trustedBy(route.params.id);
  trusts.value = [];
  for (let account of result) {
    let address = encodeAddress(account);
    trusts.value.push({
      text: await loadName(address),
      address: address,
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

  load();

  $acuityClient.api.query.system.events((events: any[]) => {

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
      <v-col cols="12" lg="10">

        <div class="text-h6">Name</div>
        <p>{{ name }}</p>

        <div class="text-h6">Telegram</div>
        <p><a target="_blank" :href="'https://t.me/' + telegram " >{{ telegram }}</a></p>

        <div class="text-h6">Address</div>
        <p>{{ $route.params.id }}</p>

        <div class="text-h6">Trusted by me</div>
        <p>{{ trusted }}</p>

        <div class="text-h6">Trusts me</div>
        <p>{{ trustsMe }}</p>

        <div class="text-h6">Trusts</div>

        <v-list density="compact">
          <v-list-item
            v-for="item in trusts"
            :key="item.address"
            :value="item"
            :to="{ name: 'account', params: { id: item.address }}"
          >
            <v-list-item-title v-text="item.text"></v-list-item-title>
          </v-list-item>
        </v-list>

        <div class="text-h6">Trusted that trust</div>

        <v-list density="compact">
          <v-list-item
            v-for="item in trustedThatTrust"
            :key="item.address"
            :value="item"
            :to="{ name: 'account', params: { id: item.address }}"
          >
            <v-list-item-title v-text="item.text"></v-list-item-title>
          </v-list-item>
        </v-list>

        <v-btn class="mt-10 mb-4" v-if="trusted == true" @click="untrust" :disabled="disabled">Untrust</v-btn>
        <v-btn class="mt-10 mb-4" v-else @click="trust" :disabled="disabled">Trust</v-btn>

        <v-progress-linear class="mb-10" :indeterminate="waiting" color="yellow darken-2"></v-progress-linear>

      </v-col>
    </v-row>
  </v-container>
</template>
