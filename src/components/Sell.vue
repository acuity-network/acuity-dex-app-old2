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

let $db: any = inject('$db');
let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let route = useRoute();
let router = useRouter();

const store = main();
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

let metaMaskSellAsset = ref('0');
let metaMaskSellAssetItems: any = computed(() => {
  let assets = [];

  assets.push({
    title: $ethClient.chainsData[metaMaskChainId.value]?.label + " (" + $ethClient.chainsData[metaMaskChainId.value]?.symbol + ")",
    value: "0",
  });

  let tokens = store.tokens[metaMaskChainId.value];

  for (let address in tokens) {
    assets.push({
      title: tokens[address].name + " (" + tokens[address].symbol + ")",
      value: address,
    });
  }

  return assets;
});

let metaMaskBuyAsset = ref('0');
let metaMaskBuyAssetItems: any = computed(() => {
  let assets = [];

  if (store.buyChainId == 0) {
    assets.push({
      title: "Acuity (ACU)",
      value: "0",
    })
  }
  else {
    assets.push({
      title: $ethClient.chainsData[store.buyChainId]?.label + " (" + $ethClient.chainsData[store.buyChainId]?.symbol + ")",
      value: "0",
    });

    let tokens = store.tokens[store.buyChainId];

    for (let address in tokens) {
      assets.push({
        title: tokens[address].name + " (" + tokens[address].symbol + ")",
        value: address,
      });
    }
  }

  return assets;
});

let polkadotSellAsset: any = ref("ACU");
let polkadotBuyAsset = ref('0');
let polkadotBuyAssetItems: any = computed(() => {
  let assets = [];

  assets.push({
    title: $ethClient.chainsData[store.buyChainId]?.label + " (" + $ethClient.chainsData[store.buyChainId]?.symbol + ")",
    value: "0",
  });

  let tokens = store.tokens[store.buyChainId];

  for (let address in tokens) {

    assets.push({
      title: tokens[address].name + " (" + tokens[address].symbol + ")",
      value: address,
    });
  }

  return assets;
});

function getSubstrateAssetId(): string {
  return $ethClient.web3.utils.padRight('0x0001', 64);
}

function getEthereumAssetId(chainId: number, tokenAddress: string | null): string {
  // 2 bytes chain type
  // 6 bytes eth chainId
  // 2 bytes address type 0 - base, 1 - ERC20
  // 2 bytes adapterId (smart contract)
  // 20 bytes tokenAddress

  let assetId = '0x0002';
  assetId += $ethClient.web3.utils.stripHexPrefix($ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(chainId), 12));

  if (!tokenAddress) {
    return $ethClient.web3.utils.padRight(assetId, 64);
  }

  assetId += '0001';
  assetId += '0001';
  assetId += $ethClient.web3.utils.stripHexPrefix(tokenAddress);

  return assetId;
}

let sellAssetIdHex: any = computed(() => {
  switch (wallet.value) {
    case 'polkadot':
      return getSubstrateAssetId();
    case 'metamask':
      return getEthereumAssetId(metaMaskChainId.value, (metaMaskSellAsset.value == "0") ? null : metaMaskSellAsset.value);
  }
});

let buyAssetIdHex: any = computed(() => {
  switch (wallet.value) {
    case 'polkadot':
      return getEthereumAssetId(store.buyChainId, (polkadotBuyAsset.value == "0") ? null : polkadotBuyAsset.value);
    case 'metamask':
      if (store.buyChainId == 0) {
        return getSubstrateAssetId();
      }
      else {
        return getEthereumAssetId(store.buyChainId, (metaMaskBuyAsset.value == "0") ? null : metaMaskBuyAsset.value);
      }
  }
});

const sellSymbol = computed(() => {
  switch(wallet.value) {
    case 'polkadot':
      return "ACU";
    case 'metamask':
      return (metaMaskSellAsset.value == "0") ? $ethClient.chainsData[metaMaskChainId.value]?.symbol : store.tokens[metaMaskChainId.value][metaMaskSellAsset.value].symbol;
  }
});

const buySymbol = computed(() => {
  switch(wallet.value) {
    case 'polkadot':
      return (polkadotBuyAsset.value == "0") ? $ethClient.chainsData[store.buyChainId]?.symbol : store.tokens[store.buyChainId][polkadotBuyAsset.value].symbol;
    case 'metamask':
      if (store.buyChainId == 0) {
        return "ACU";
      }
      return (metaMaskBuyAsset.value == "0") ? $ethClient.chainsData[store.buyChainId]?.symbol : store.tokens[store.buyChainId][metaMaskBuyAsset.value].symbol;
  }
});

const sellDecimals = computed(() => {
  switch(wallet.value) {
    case 'polkadot':
      return 18;
    case 'metamask':
      return (metaMaskSellAsset.value == "0") ? 18 : store.tokens[metaMaskChainId.value][metaMaskSellAsset.value].decimals;
  }
});

const buyDecimals = computed(() => {
  switch(wallet.value) {
    case 'polkadot':
      return (polkadotBuyAsset.value == "0") ? 18 : store.tokens[store.buyChainId][polkadotBuyAsset.value].decimals;
    case 'metamask':
      if (store.buyChainId == 0) {
        return 18;
      }
      return (metaMaskBuyAsset.value == "0") ? 18 : store.tokens[store.buyChainId][metaMaskBuyAsset.value].decimals;
  }
});

const setDisabled = ref(false);
const setWaiting = ref(false);

const sellValue = ref("");
const sellPrice = ref("");
const sellTotal = computed(() => {

  let sellValueWei = BigInt($ethClient.unformatWei((sellValue.value != '') ? sellValue.value : '0', sellDecimals.value));
  let sellPriceWei = BigInt($ethClient.unformatWei((sellPrice.value != '') ? sellPrice.value : '0', buyDecimals.value));
  let buyValueWei = (sellValueWei * sellPriceWei) / (BigInt(10) ** BigInt(sellDecimals.value));

  return $ethClient.formatWei(buyValueWei.toString(), buyDecimals.value);
});

let emitter;

async function load() {

  console.log("sellAssetId:", sellAssetIdHex.value);
  console.log("buyAssetId:", buyAssetIdHex.value);

  if (sellAssetIdHex.value && buyAssetIdHex.value) {
    try {
      let result = (await $acuityClient.api.query.orderbook.accountPairOrder(store.activeAcu, sellAssetIdHex.value, buyAssetIdHex.value)).unwrap();

      sellPrice.value = $ethClient.formatWei(result.price, buyDecimals.value);
      sellValue.value = $ethClient.formatWei(result.value, sellDecimals.value);
    }
    catch (e) {};
  }
}

onMounted(async () => {
  if (metaMaskChainId.value && $ethClient.chains[metaMaskChainId.value]) {
    emitter = $ethClient.chains[metaMaskChainId.value].ws.atomicSwap.events.allEvents()
    .on('data', async (log: any) => {
      load();
    });
  }
  if (metaMaskChainId.value && $ethClient.chains[metaMaskChainId.value]) {
    emitter = $ethClient.chains[metaMaskChainId.value].ws.atomicSwapERC20.events.allEvents()
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
  if (newValue && $ethClient.chains[newValue]?.atomicSwap) {
    emitter = $ethClient.chains[newValue].ws.atomicSwap.events.allEvents()
  	.on('data', async (log: any) => {
      load();
    });
  }

  if (newValue && $ethClient.chains[newValue]?.atomicSwapERC20) {
    emitter = $ethClient.chains[newValue].ws.atomicSwapERC20.events.allEvents()
  	.on('data', async (log: any) => {
      load();
    });
  }

  load();
});

watch(metaMaskSellAsset, async (newValue, oldValue) => {
  load();
});

watch(() => store.buyChainId, async (newValue, oldValue) => {
  load();
});

watch(metaMaskBuyAsset, async (newValue, oldValue) => {
  load();
});

watch(polkadotBuyAsset, async (newValue, oldValue) => {
  load();
});

async function set(event: any) {
  setDisabled.value = true;
  const injector = await web3FromAddress(store.activeAcu);
  let price = $ethClient.unformatWei(sellPrice.value, buyDecimals.value);
  let value = $ethClient.unformatWei(sellValue.value, sellDecimals.value);

  try {
    const unsub = await $acuityClient.api.tx.orderbook
      .setOrder(sellAssetIdHex.value, buyAssetIdHex.value, price, value)
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
  router.push({
    name: 'sell-order',
    params: {
      accountId: store.activeAcu,
      sellAssetId: sellAssetIdHex.value,
      buyAssetId: buyAssetIdHex.value,
    },
  })
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" lg="10">
        <v-select v-model="wallet" :items="wallets" label="Sell wallet"></v-select>

        <template v-if="wallet == 'metamask'">
          <v-text-field v-model="store.metaMaskChainName" label="Sell chain" readonly hint="Select in MetaMask." persistent-hint></v-text-field>
          <v-select v-model="metaMaskSellAsset" :items="metaMaskSellAssetItems" label="Sell asset"></v-select>
          <v-select v-model="store.buyChainId" :items="store.chainSelect" label="Buy chain"></v-select>
          <v-select v-model="metaMaskBuyAsset" :items="metaMaskBuyAssetItems" label="Buy asset"></v-select>
        </template>

        <template v-if="wallet == 'polkadot'">
          <v-select v-model="substrateChain" :items="substrateChains" label="Sell chain"></v-select>
          <v-text-field v-model="polkadotSellAsset" label="Sell asset" readonly></v-text-field>
          <v-select v-model="store.buyChainId" :items="store.chainSelect" label="Buy chain"></v-select>
          <v-select v-model="polkadotBuyAsset" :items="polkadotBuyAssetItems" label="Buy asset"></v-select>
        </template>

        <v-card class="mb-10">
          <v-toolbar color="blue">
            <v-toolbar-title>Sell order</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
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
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="success" @click="set" :disabled="setDisabled">Set</v-btn>
            <v-btn color="success" @click="reset">Reset</v-btn>
            <v-btn color="success" @click="goto">Goto</v-btn>
          </v-card-actions>
          <v-progress-linear :indeterminate="setWaiting" color="yellow darken-2"></v-progress-linear>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
