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
const chains = computed(() => store.ethChains);
const chainSelect = computed(() => store.chainSelect);
const metaMaskChainId = computed(() => store.metaMaskChainId);

const wallets = [
  {
    title: 'MetaMask Browser Extension',
    value: 'metamask',
  },
  {
    title: 'Polkadot Browser Extension',
    value: 'polkadot',
  },
];

const wallet = ref('metamask');

const substrateChains = [
  {
    title: 'Acuity',
    value: 'acuity',
  },
];

const substrateChain = ref('acuity');

let sellAssetId: any = computed(() => $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.metaMaskChainId), 64));
let buyAssetId: any = computed(() => $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.buyChainId), 64));

const stashed = ref(null);
const valueToStash = ref("");
const valueToWithdraw = ref("");

const stashDisabled = ref(false);
const stashWaiting = ref(false);
const unstashDisabled = ref(false);
const unstashWaiting = ref(false);
const setDisabled = ref(false);
const setWaiting = ref(false);

const sellSymbol = computed(() => (wallet.value == 'metamask') ? (metaMaskChainId.value ? $ethClient.chainsData[metaMaskChainId.value]?.symbol : "") : "ACU");
const buySymbol = computed(() => (wallet.value == 'metamask') ? ((store.buyChainId == 0) ? "ACU" : (store.buyChainId ? $ethClient.chainsData[store.buyChainId]?.symbol : "")) : (metaMaskChainId.value ? $ethClient.chainsData[metaMaskChainId.value]?.symbol: ""));

const sellValue = ref(null);
const sellPrice = ref(null);
const sellTotal = computed(() => (sellValue.value ?? 0) * (sellPrice.value ?? 0));


let emitter;


async function load() {

  switch (wallet.value) {
    case 'metamask':
      if (metaMaskChainId.value && $ethClient.chains[metaMaskChainId.value]?.atomicSwap) {
        try {
          stashed.value = $ethClient.formatWei(await $ethClient.chains[metaMaskChainId.value].atomicSwap.methods.getStashValue(buyAssetId.value, store.metaMaskAccount).call());
        }
        catch (e) {};
      }
      break;

    case 'polkadot':
      try {
        stashed.value = $ethClient.formatWei(await $acuityClient.api.query.atomicSwap.stashValue(buyAssetId.value, store.activeAcu));
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
  if (metaMaskChainId.value && $ethClient.chains[metaMaskChainId.value]) {
    emitter = $ethClient.chains[metaMaskChainId.value].atomicSwap.events.allEvents()
    .on('data', async (log: any) => {
      load();
    });
  }
  load();
})

watch(wallet, async (newValue, oldValue) => {
  load();
});

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
  switch (wallet.value) {
    case 'metamask':
      $ethClient.atomicSwap.methods
        .depositStash(buyAssetId.value)
        .send({from: store.metaMaskAccount, value: $ethClient.web3.utils.toWei(valueToStash.value)})
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
      break;

    case 'polkadot':
      const injector = await web3FromAddress(store.activeAcu);

      try {
        const unsub = await $acuityClient.api.tx.atomicSwap
          .depositStash(buyAssetId.value, $ethClient.web3.utils.toWei(valueToStash.value))
          .signAndSend(store.activeAcu, { signer: injector.signer }, (result: any) => {
            if (!result.status.isInBlock) {
              stashWaiting.value = true;
            }
            else {
              unsub();
              load();
              stashWaiting.value = false;
              stashDisabled.value = false;
            }
          });
      }
      catch (e) {
        stashWaiting.value = false;
        stashDisabled.value = false;
      }
      break;
  }
}

async function unstash(event: any) {
  unstashDisabled.value = true;
  switch (wallet.value) {
    case 'metamask':
      $ethClient.atomicSwap.methods
        .withdrawStash(buyAssetId.value, $ethClient.web3.utils.toWei(valueToWithdraw.value))
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
        break;

      case 'polkadot':
        const injector = await web3FromAddress(store.activeAcu);

        try {
          const unsub = await $acuityClient.api.tx.atomicSwap
            .withdrawStash(buyAssetId.value, $ethClient.web3.utils.toWei(valueToWithdraw.value))
            .signAndSend(store.activeAcu, { signer: injector.signer }, (result: any) => {
              if (!result.status.isInBlock) {
                unstashWaiting.value = true;
              }
              else {
                unsub();
                load();
                unstashWaiting.value = false;
                unstashDisabled.value = false;
              }
            });
        }
        catch (e) {
          unstashWaiting.value = false;
          unstashDisabled.value = false;
        }
      break;
    }
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

async function goto(event: any) {
  let sellAssetId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.metaMaskChainId), 32);
  let buyAssetId = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(store.buyChainId), 32);

  router.push({
    name: 'sell-order',
    params: {
      accountId: store.activeAcu,
      sellAssetId: sellAssetId,
      buyAssetId: buyAssetId,
    },
  })
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="10">
        <v-select v-model="wallet" :items="wallets" label="Sell wallet"></v-select>

        <template v-if="wallet == 'metamask'">
          <v-text-field v-model="store.metaMaskChainName" label="Sell chain" readonly hint="Select in MetaMask." persistent-hint></v-text-field>
          <v-text-field v-model="store.metaMaskAccount" label="Sell account" readonly hint="Select in MetaMask." persistent-hint></v-text-field>
          <v-select v-model="store.buyChainId" :items="chainSelect" label="Buy chain"></v-select>
        </template>

        <template v-if="wallet == 'polkadot'">
          <v-select v-model="substrateChain" :items="substrateChains" label="Sell chain"></v-select>
          <v-text-field readonly v-model="store.activeAcuName" label="Sell account"></v-text-field>
          <v-text-field v-model="store.metaMaskChainName" label="Buy chain" readonly hint="Select in MetaMask." persistent-hint></v-text-field>
          <v-text-field v-model="store.metaMaskAccount" label="Buy account" readonly hint="Select in MetaMask." persistent-hint></v-text-field>
        </template>

        <div class="text-h6 mb-10">Stash</div>
        <v-text-field v-model="stashed" label="Current stash" :suffix="sellSymbol" readonly></v-text-field>
        <v-text-field v-model="valueToStash" label="Value to stash" :suffix="sellSymbol" :disabled="stashDisabled"></v-text-field>
        <v-btn class="mb-4" @click="stash" :disabled="stashDisabled">Stash</v-btn>
        <v-progress-linear class="mb-10" :indeterminate="stashWaiting" color="yellow darken-2"></v-progress-linear>

        <v-text-field v-model="valueToWithdraw" label="Value to unstash" :suffix="sellSymbol" :disabled="unstashDisabled"></v-text-field>
        <v-btn class="mb-4" @click="unstash" :disabled="unstashDisabled">Unstash</v-btn>
        <v-progress-linear class="mb-10" :indeterminate="unstashWaiting" color="yellow darken-2"></v-progress-linear>

        <div class="text-h6 mb-10">Sell order</div>
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
          <v-btn @click="goto">Goto</v-btn>
        </div>
        <v-progress-linear class="mb-10" :indeterminate="setWaiting" color="yellow darken-2"></v-progress-linear>
      </v-col>
    </v-row>
  </v-container>
</template>
