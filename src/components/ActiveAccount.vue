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
import { main } from '../stores/index'

let $db: any = inject('$db');
let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();
const addressesAcu = computed(() => store.addressesAcu);
const chains = computed(() => store.ethChains);
const metaMaskChainId = computed(() => store.metaMaskChainId);
const metaMaskChainName = computed(() => store.metaMaskChainName);
const metaMaskAccount = computed(() => store.metaMaskAccount);
const acuAccountForeignAccount = computed(() => store.acuAccountForeignAccount);
const foreignAccountAcuAccount = computed(() => store.foreignAccountAcuAccount);

const acuAddress = ref(store.addressesAcu[0]);
const name = ref("");
const setNameDisabled = ref(false);
const setNameWaiting = ref(false);
const setForeignAccountDisabled = ref(false);
const setForeignAccountWaiting = ref(false);
const setAcuAccountDisabled = ref(false);
const setAcuAccountWaiting = ref(false);

async function loadName(address: string): Promise<string> {
  try {
    let result = await $acuityClient.api.query.identity.identityOf(address);
    let json = result.unwrap().info.display.toString();
    let display = JSON.parse(json);
    return $ethClient.web3.utils.hexToAscii(display.raw);
  }
  catch (e) {
    return '';
  }
}

async function load() {
  name.value = await loadName(acuAddress.value);

  for (let chainIdKey of Object.keys(store.ethChains)) {
    let chainId = parseInt(chainIdKey);
    let chainIdHex = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(chainId), 16);
    let result = await $acuityClient.api.query.orderbook.accountForeignAccount(acuAddress.value, chainIdHex);
    let foreignAddress = '0x' + Buffer.from(result).toString('hex').slice(24);
    store.acuAccountForeignAccountSet(chainId, acuAddress.value, foreignAddress);

    if ($ethClient.chains[chainId].account) {
      let mappedAcuAddress = encodeAddress(await $ethClient.chains[chainId].account.methods.getAcuAccount(foreignAddress).call());
      store.foreignAccountAcuAccountSet(chainId, foreignAddress, mappedAcuAddress);
    }
  }
};

onMounted(async () => {
  $acuityClient.api.query.system.events((events: any[]) => {
    events.forEach((record) => {
      // Extract the phase, event and the event types
      const { event, phase } = record;
      if (event.section == 'orderbook') {
        load();
      }
    });
  });

  for (let chainId of Object.keys(store.ethChains)) {
    if ($ethClient.chains[chainId].account) {
      let emitter = $ethClient.chains[chainId].account.events.allEvents()
    	.on('data', async (log: any) => {
        load();
      });
    }
  }

  load();
});

watch(acuAddress, async (newValue, oldValue) => {
  load();
});

async function setIdentity(event: any) {
  setNameDisabled.value = true;
  const injector = await web3FromAddress(acuAddress.value);

  const identity = {
    "additional": [],
    "display": $ethClient.web3.utils.padLeft($ethClient.web3.utils.numberToHex(name.value.length + 1), 2) +  $ethClient.web3.utils.asciiToHex(name.value).slice(2),
    "legal": null,
    "web": null,
    "riot": null,
    "email": null,
    "pgpFingerprint": null,
    "image": null,
    "twitter": null,
  };

  console.log(identity);

  try {
    const unsub = await $acuityClient.api.tx.identity
      .setIdentity(identity)
      .signAndSend(acuAddress.value, { signer: injector.signer }, (result: any) => {
        if (!result.status.isInBlock) {
          setNameWaiting.value = true;
        }
        else {
          unsub();
          load();
          setNameWaiting.value = false;
          setNameDisabled.value = false;
        }
      });
  }
  catch (e) {
    console.error(e);
    setNameWaiting.value = false;
    setNameDisabled.value = false;
  }
}

async function setForeignAccount(event: any) {
  setForeignAccountDisabled.value = true;
  const injector = await web3FromAddress(acuAddress.value);
  let chainId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.metaMaskChainId), 16);
  let foreignAccount = $ethClient.web3.utils.padLeft(store.metaMaskAccount, 64);
  try {
    const unsub = await $acuityClient.api.tx.orderbook
      .setForeignAccount(chainId, foreignAccount)
      .signAndSend(acuAddress.value, { signer: injector.signer }, (result: any) => {
        if (!result.status.isInBlock) {
          setForeignAccountWaiting.value = true;
        }
        else {
          unsub();
          setForeignAccountWaiting.value = false;
          setForeignAccountDisabled.value = false;
        }
      });
  }
  catch (e) {
    setForeignAccountWaiting.value = false;
    setForeignAccountDisabled.value = false;
  }
}

async function setAcuAccount(event: any) {
  setAcuAccountDisabled.value = true;
  let acuAddressHex = '0x' + Buffer.from(decodeAddress(acuAddress.value)).toString('hex');
  $ethClient.account.methods
    .setAcuAccount(acuAddressHex)
    .send({from: store.metaMaskAccount})
    .on('transactionHash', function(payload: any) {
      setAcuAccountWaiting.value = true;
    })
    .on('receipt', function(receipt: any) {
      setAcuAccountWaiting.value = false;
      setAcuAccountDisabled.value = false;
    })
    .on('error', function(error: any) {
      setAcuAccountWaiting.value = false;
      setAcuAccountDisabled.value = false;
    });
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-select v-model="acuAddress" :items="store.accountsAcu" label="Acuity account"></v-select>
        <v-text-field v-model="name" label="Identity" hint="Enter your name." persistent-hint></v-text-field>
        <v-btn class="mb-4" @click="setIdentity" :disabled="setNameDisabled">Set Identity</v-btn>
        <v-progress-linear class="mb-10" :indeterminate="setNameWaiting" color="yellow darken-2"></v-progress-linear>

        <div v-for="chain in chains">
          <div class="text-h6">{{ chain.label }}</div>
          <div v-if="acuAccountForeignAccount[chain.chainId]">
            {{ acuAccountForeignAccount[chain.chainId][acuAddress] }}
            <span v-if="foreignAccountAcuAccount[chain.chainId] && (foreignAccountAcuAccount[chain.chainId][acuAccountForeignAccount[chain.chainId][acuAddress]] == acuAddress)"><v-icon icon="mdi-link-variant"></v-icon></span>
          </div>
        </div>
        <div v-if="metaMaskChainId && chains[metaMaskChainId]" class="mt-10" >
          <v-btn class="mb-4" @click="setForeignAccount" :disabled="setForeignAccountDisabled">Set {{ metaMaskChainName }} Account on Acuity</v-btn>
          <v-progress-linear class="mb-10" :indeterminate="setForeignAccountWaiting" color="yellow darken-2"></v-progress-linear>

          <v-btn class="mb-4" @click="setAcuAccount" :disabled="setAcuAccountDisabled">Set Acuity Account on {{ metaMaskChainName }}</v-btn>
          <v-progress-linear class="mb-10" :indeterminate="setAcuAccountWaiting" color="yellow darken-2"></v-progress-linear>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>
