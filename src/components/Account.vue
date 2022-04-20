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

defineProps<{ msg: string }>()

const count = ref(0)


let $acuityClient;
let $ethClient;

const name = ref("");


onMounted(async () => {
  $acuityClient = inject('$acuityClient');
  $ethClient = inject('$ethClient');
  const router = useRouter()
  const route = useRoute()
  const allInjected = await web3Enable('Acuity Browser');
  await $acuityClient.init();
  console.log(route.params.id);
  let result = await $acuityClient.api.query.identity.identityOf(route.params.id);
//  name.value = await $acuityClient.api.query.system.account(route.params.id);
//  name.value = await $acuityClient.api.query.timestamp.now();
//  console.log(name.value.nonce.toString());
//  console.log(name.value.info.display.Raw.toString());
  let json = result.unwrap().info.display.toString();
  let display = JSON.parse(json);
  name.value = $ethClient.web3.utils.hexToAscii(display.raw);
})


</script>

<template>
  <p>
    address: {{ $route.params.id }}
  </p>
  <p>{{ name }}</p>

  <button type="button" @click="count++">count is: {{ count }}</button>
  <p>
    Edit
    <code>components/HelloWorld.vue</code> to test hot module replacement.
  </p>
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
