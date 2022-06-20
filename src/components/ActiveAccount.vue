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
import { encodeAddress, decodeAddress } from '@polkadot/keyring';
import { main } from '@/stores/index.ts'

let $db = inject('$db');
let $acuityClient = inject('$acuityClient');
let $ethClient = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();
const accountsAcu = computed(() => store.accountsAcu);
const addressesAcu = computed(() => store.addressesAcu);
const chains = computed(() => store.chains);
const metaMaskChainId = computed(() => store.metaMaskChainId);
const metaMaskAccount = computed(() => store.metaMaskAccount);
const acuAccountForeignAccount = computed(() => store.acuAccountForeignAccount);
const foreignAccountAcuAccount = computed(() => store.foreignAccountAcuAccount);

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

  for (let chainId of Object.keys(store.chains)) {
    let chainIdHex = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(chainId), 16);
    let result = await $acuityClient.api.query.orderbook.accountForeignAccount(store.activeAcu, chainIdHex);
    let foreignAddress = '0x' + Buffer.from(result).toString('hex').slice(24);
    store.acuAccountForeignAccountSet(chainId, store.activeAcu, foreignAddress);

    if ($ethClient.chains[chainId].account) {
      let acuAddress = encodeAddress(await $ethClient.chains[chainId].account.methods.getAcuAccount(foreignAddress).call());
      store.foreignAccountAcuAccountSet(chainId, foreignAddress, acuAddress);
    }
  }
};

onMounted(async () => {
  $acuityClient.api.query.system.events((events) => {
    events.forEach((record) => {
      // Extract the phase, event and the event types
      const { event, phase } = record;
      if (event.section == 'orderbook') {
        load();
      }
    });
  });

  for (let chainId of Object.keys(store.chains)) {
    if ($ethClient.chains[chainId].account) {
      let emitter = $ethClient.chains[chainId].account.events.allEvents()
    	.on('data', async (log: any) => {
        load();
      });
    }
  }

  load();
});

watch(activeAccount, async (newValue, oldValue) => {
  $db.put('/activeAccount', activeAccount.value);
  store.activeAcuSet(activeAccount.value);
  load();
});

async function setForeignAccount(event) {
  const injector = await web3FromAddress(store.activeAcu);
  let chainId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.metaMaskChainId), 16);
  let foreignAccount = $ethClient.web3.utils.padLeft(store.metaMaskAccount, 64);
  $acuityClient.api.tx.orderbook
    .setForeignAccount(chainId, foreignAccount)
    .signAndSend(store.activeAcu, { signer: injector.signer }, (status: any) => {
      console.log(status)
    });
}

async function setAcuAccount(event) {
  let acuAddress = '0x' + Buffer.from(decodeAddress(store.activeAcu)).toString('hex');
  $ethClient.account.methods
    .setAcuAccount(acuAddress)
    .send({from: store.metaMaskAccount});
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">

        <v-select v-model="activeAccount" :items="accountsAcu" label="Active account"></v-select>

        <div class="text-h6">Public Identity</div>
        <p>{{ name }}</p>

        <div v-for="chain in chains">
          <div class="text-h6">{{ chain.label }}</div>
          <div v-if="acuAccountForeignAccount[chain.chainId]">
            {{ acuAccountForeignAccount[chain.chainId][activeAccount] }}
            <span v-if="foreignAccountAcuAccount[chain.chainId] && (foreignAccountAcuAccount[chain.chainId][acuAccountForeignAccount[chain.chainId][activeAccount]] == activeAccount)"><v-icon icon="mdi-link-variant"></v-icon></span>
          </div>
        </div>

        <v-btn class="mt-10 mr-10" @click="setForeignAccount">Set Foreign Account</v-btn>
        <v-btn class="mt-10" @click="setAcuAccount">Set ACU Account</v-btn>

      </v-col>
    </v-row>
  </v-container>
</template>
