<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
  web3ListRpcProviders,
  web3UseRpcProvider
} from '@polkadot/extension-dapp';

let $acuityClient;
let $ethClient;
let route, router;

const name = ref("");
const trusted = ref(false);

async function trust(event) {
  let address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const injector = await web3FromAddress(address);
  $acuityClient.api.tx.trustedAccounts
    .trustAccount(route.params.id)
    .signAndSend(address, { signer: injector.signer }, (status: any) => {
      console.log(status)
    });
}

async function untrust(event) {
  let address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const injector = await web3FromAddress(address);
  $acuityClient.api.tx.trustedAccounts
    .untrustAccount(route.params.id)
    .signAndSend(address, { signer: injector.signer }, (status: any) => {
      console.log(status)
    });
}

async function load() {

  let result = await $acuityClient.api.query.identity.identityOf(route.params.id);
  let json = result.unwrap().info.display.toString();
  let display = JSON.parse(json);
  name.value = $ethClient.web3.utils.hexToAscii(display.raw);

  trusted.value = await $acuityClient.api.rpc.trustedAccounts.isTrusted("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", route.params.id);
}

onMounted(async () => {
  $acuityClient = inject('$acuityClient');
  $ethClient = inject('$ethClient');
  router = useRouter();
  route = useRoute();
  const allInjected = await web3Enable('Acuity Browser');
  await $acuityClient.init();

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

        <div class="text-h6">Trusted</div>
        <p>{{ trusted }}</p>

        <v-btn v-if="trusted == true" @click="untrust">Untrust</v-btn>
        <v-btn v-else @click="trust">Trust</v-btn>

      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
</style>
