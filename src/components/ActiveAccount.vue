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
const web = ref("");
const riot = ref("");
const twitter = ref("");
const telegram = ref("");

const setNameDisabled = ref(false);
const setNameWaiting = ref(false);
const setForeignAccountDisabled = ref(false);
const setForeignAccountWaiting = ref(false);
const setAcuAccountDisabled = ref(false);
const setAcuAccountWaiting = ref(false);

async function load() {
  let result = await $acuityClient.api.query.identity.identityOf(acuAddress.value);

  name.value = '';
  web.value = '';
  riot.value = '';
  twitter.value = '';
  telegram.value = '';

  try {
    let info = result.unwrap().info;

    try {
      name.value = $ethClient.web3.utils.hexToAscii(JSON.parse(info.display.toString()).raw);
    }
    catch (e) {}

    try {
      web.value = $ethClient.web3.utils.hexToAscii(JSON.parse(info.web.toString()).raw);
    }
    catch (e) {}

    try {
      riot.value = $ethClient.web3.utils.hexToAscii(JSON.parse(info.riot.toString()).raw);
    }
    catch (e) {}

    try {
      twitter.value = $ethClient.web3.utils.hexToAscii(JSON.parse(info.twitter.toString()).raw);
    }
    catch (e) {}

    try {
      telegram.value = $ethClient.web3.utils.hexToAscii(JSON.parse(info.additional.toString())[0][1].raw);
    }
    catch (e) {}
  }
  catch (e) {}

  for (let chainIdKey of Object.keys(store.ethChains)) {
    let chainId = parseInt(chainIdKey);
    let chainIdHex = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(chainId), 16);

    try {
      let result = (await $acuityClient.api.query.orderbook.accountForeignAccount(acuAddress.value, chainIdHex)).unwrap();
      let foreignAddress = '0x' + Buffer.from(result).toString('hex').slice(24);
      store.acuAccountForeignAccountSet(chainId, acuAddress.value, foreignAddress);

      if ($ethClient.chains[chainId].account) {
        let mappedAcuAddress = encodeAddress(await $ethClient.chains[chainId].account.methods.getAcuAccount(foreignAddress).call());
        store.foreignAccountAcuAccountSet(chainId, foreignAddress, mappedAcuAddress);
      }
    }
    catch (e) {}
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

function encodeString(text: string) {
  if (text.length == 0) {
    return null;
  }
  return $ethClient.web3.utils.padLeft($ethClient.web3.utils.numberToHex(text.length + 1), 2) +  $ethClient.web3.utils.asciiToHex(text).slice(2);
}

async function setIdentity(event: any) {
  setNameDisabled.value = true;
  const injector = await web3FromAddress(acuAddress.value);

  const identity = {
    "additional": [[encodeString("telegram"), encodeString(telegram.value)]],
    "display": encodeString(name.value),
    "legal": null,
    "web": encodeString(web.value),
    "riot": encodeString(riot.value),
    "email": null,
    "pgpFingerprint": null,
    "image": null,
    "twitter": encodeString(twitter.value),
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
        <v-card>
          <v-toolbar color="blue">
            <v-toolbar-title>Public Information</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-text-field v-model="name" label="Name" hint="Enter your name."></v-text-field>
            <v-text-field v-model="web" label="Website" hint="Enter your website address."></v-text-field>
            <v-text-field v-model="twitter" label="Twitter" hint="Enter your Twitter handle."></v-text-field>
            <v-text-field v-model="riot" label="Matrix" hint="Enter your Matrix ID."></v-text-field>
            <v-text-field v-model="telegram" label="Telegram" hint="Enter your Telegram ID."></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="success" @click="setIdentity" :disabled="setNameDisabled">Set Identity</v-btn>
          </v-card-actions>
          <v-progress-linear :indeterminate="setNameWaiting" color="yellow darken-2"></v-progress-linear>
        </v-card>

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
