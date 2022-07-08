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
const chains = computed(() => store.chains);
const chainSelect = computed(() => store.chainSelect);
const metaMaskChainId = computed(() => store.metaMaskChainId);

let sellAssetId: any = computed(() => $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.metaMaskChainId), 32));
let buyAssetId = computed(() => $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.buyChainId), 32));

const eth = ref(null);
const ethToStash = ref("");
const ethToWithdraw = ref("");

const stashDisabled = ref(false);
const stashWaiting = ref(false);
const unstashDisabled = ref(false);
const unstashWaiting = ref(false);
const setDisabled = ref(false);
const setWaiting = ref(false);

const sellSymbol = computed(() => metaMaskChainId.value ? $ethClient.chainsData[metaMaskChainId.value].symbol : "");
const buySymbol = computed(() => store.buyChainId ? $ethClient.chainsData[store.buyChainId].symbol : '');

const sellValue = ref(null);
const sellPrice = ref(null);
const sellTotal = computed(() => (sellValue.value ?? 0) * (sellPrice.value ?? 0));


let emitter;


async function load() {

  if (metaMaskChainId.value && $ethClient.chains[metaMaskChainId.value].atomicSwap) {
    try {
      eth.value = $ethClient.formatWei(await $ethClient.chains[metaMaskChainId.value].atomicSwap.methods.getStashValue(buyAssetId.value, store.metaMaskAccount).call());
    }
    catch (e) {};
  }

  if (sellAssetId.value && buyAssetId.value) {
    let result = await $acuityClient.api.query.orderbook.orderbook(store.activeAcu, sellAssetId.value, buyAssetId.value);

    sellPrice.value = $ethClient.web3.utils.fromWei(result.price);
    sellValue.value = $ethClient.web3.utils.fromWei(result.value);
  }
}

onMounted(async () => {
  if (metaMaskChainId.value) {
    emitter = $ethClient.chains[metaMaskChainId.value].atomicSwap.events.allEvents()
    .on('data', async (log: any) => {
      load();
    });
  }
  load();
})

watch(metaMaskChainId, async (newValue, oldValue) => {
  if (newValue && $ethClient.chains[newValue].atomicSwap) {
    emitter = $ethClient.chains[newValue].atomicSwap.events.allEvents()
  	.on('data', async (log: any) => {
      load();
    });
  }

  load();
});

watch(() => store.buyChainId, async (newValue, oldValue) => {
  load();
});

async function stash(event: any) {
  stashDisabled.value = true;
  $ethClient.atomicSwap.methods
    .depositStash(buyAssetId.value)
    .send({from: store.metaMaskAccount, value: $ethClient.web3.utils.toWei(ethToStash.value)})
    .on('transactionHash', function(payload: any) {
      stashWaiting.value = true;
    })
    .on('receipt', function(receipt: any) {
      stashWaiting.value = false;
      stashDisabled.value = false;
    })
    .on('error', function(error: any) {
      stashWaiting.value = false;
      stashDisabled.value = false;
    });
}

async function unstash(event: any) {
  unstashDisabled.value = true;
  $ethClient.atomicSwap.methods
    .withdrawStash(buyAssetId.value, $ethClient.web3.utils.toWei(ethToWithdraw.value))
    .send({from: store.metaMaskAccount})
    .on('transactionHash', function(payload: any) {
      unstashWaiting.value = true;
    })
    .on('receipt', function(receipt: any) {
      unstashWaiting.value = false;
      unstashDisabled.value = false;
    })
    .on('error', function(error: any) {
      unstashWaiting.value = false;
      unstashDisabled.value = false;
    });
}

async function set(event: any) {
  setDisabled.value = true;
  const injector = await web3FromAddress(store.activeAcu);
  let price = $ethClient.web3.utils.toWei(sellPrice.value);
  let value = $ethClient.web3.utils.toWei(sellValue.value);

  try {
    const unsub = await $acuityClient.api.tx.orderbook
      .setOrder(sellAssetId.value, buyAssetId.value, price, value)
      .signAndSend(store.activeAcu, { signer: injector.signer }, (result: any) => {
        if (!result.status.isInBlock) {
          setWaiting.value = true;
        }
        else {
          unsub();
          load();
          setWaiting.value = false;
          setDisabled.value = false;
        }
      });
  }
  catch (e) {
    setWaiting.value = false;
    setDisabled.value = false;
  }
}

async function reset(event: any) {
  load();
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-select readonly v-model="metaMaskChainId" :items="chainSelect" label="Sell chain"></v-select>
        <v-text-field v-model="store.metaMaskAccount" label="Sell account" readonly></v-text-field>
        <v-select v-model="store.buyChainId" :items="chainSelect" label="Buy chain"></v-select>
        <div class="text-h6 mb-10">Stash</div>
        <v-text-field v-model="eth" label="Current stash" :suffix="sellSymbol" readonly></v-text-field>
        <v-text-field v-model="ethToStash" label="Value to stash" :suffix="sellSymbol" :disabled="stashDisabled"></v-text-field>
        <v-btn class="mb-4" @click="stash" :disabled="stashDisabled">Stash</v-btn>
        <v-progress-linear class="mb-10" :indeterminate="stashWaiting" color="yellow darken-2"></v-progress-linear>

        <v-text-field v-model="ethToWithdraw" label="Value to unstash" :suffix="sellSymbol" :disabled="unstashDisabled"></v-text-field>
        <v-btn class="mb-4" @click="unstash" :disabled="unstashDisabled">Unstash</v-btn>
        <v-progress-linear class="mb-10" :indeterminate="unstashWaiting" color="yellow darken-2"></v-progress-linear>

        <div class="text-h6 mb-10">Sell order</div>
        <v-text-field readonly v-model="store.activeAcuName" label="Acuity account"></v-text-field>
        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="sellPrice" label="Price" :suffix="buySymbol + ' / ' + sellSymbol"></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="sellValue" label="Value" :suffix="sellSymbol"></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field v-model="sellTotal" readonly label="Total" :suffix="buySymbol"></v-text-field>
          </v-col>
        </v-row>
        <div class="d-flex mb-4" style="gap: 1rem">
          <v-btn @click="set" :disabled="setDisabled">Set</v-btn>
          <v-btn @click="reset">Reset</v-btn>
        </div>
        <v-progress-linear class="mb-10" :indeterminate="setWaiting" color="yellow darken-2"></v-progress-linear>
      </v-col>
    </v-row>
  </v-container>
</template>
