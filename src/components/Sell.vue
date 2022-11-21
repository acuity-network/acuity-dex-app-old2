<script setup lang="ts">
import { ref, inject, onMounted, computed, watch} from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { web3FromAddress } from '@polkadot/extension-dapp';
import { main } from '../stores/index'

let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let router = useRouter();

const store = main();

let sellChainId: Ref<number | null> = ref(null);
let sellAsset: Ref<string | null> = ref(null);
let buyChainId: Ref<number | null> = ref(null);
let buyAsset: Ref<string | null> = ref(null);

let sellAssetItems: any = computed(() => {
  if (sellChainId.value == null) return [];
  if (sellChainId.value == 0) {
    return [
      {
        title: "Acuity (ACU)",
        value: "",
      }
    ];
  }

  let assets = [];

  assets.push({
    title: $ethClient.chainsData[sellChainId.value]?.label + " (" + $ethClient.chainsData[sellChainId.value]?.symbol + ")",
    value: "",
  });

  let tokens = store.tokens[sellChainId.value];

  for (let address in tokens) {
    assets.push({
      title: tokens[address].name + " (" + tokens[address].symbol + ")",
      value: address,
    });
  }

  return assets;
});

let buyAssetItems: any = computed(() => {
  if (buyChainId.value == null) return [];
  if (buyChainId.value == 0) {
    return [
      {
        title: "Acuity (ACU)",
        value: "",
      }
    ];
  }

  let assets = [];

  assets.push({
    title: $ethClient.chainsData[buyChainId.value]?.label + " (" + $ethClient.chainsData[buyChainId.value]?.symbol + ")",
    value: "",
  });

  let tokens = store.tokens[buyChainId.value];

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
  if (sellChainId.value == null || sellAsset.value == null) {
    return null;
  }
  if (sellChainId.value == 0) {
    return getSubstrateAssetId();
  }
  return getEthereumAssetId(sellChainId.value, (sellAsset.value == "") ? null : sellAsset.value);
});

let buyAssetIdHex: any = computed(() => {
  if (buyChainId.value == null || buyAsset.value == null) {
    return null;
  }
  if (buyChainId.value == 0) {
    return getSubstrateAssetId();
  }
  else {
    return getEthereumAssetId(buyChainId.value, (buyAsset.value == "") ? null : buyAsset.value);
  }
});

const sellSymbol = computed(() => {
  if (sellChainId.value == null || sellAsset.value == null) {
    return '';
  }
  if (sellChainId.value == 0) {
    return 'ACU';
  }
  return (sellAsset.value == "") ? $ethClient.chainsData[sellChainId.value]?.symbol : store.tokens[sellChainId.value][sellAsset.value].symbol;
});

const buySymbol = computed(() => {
  if (buyChainId.value == null || buyAsset.value == null) {
    return '';
  }
  if (buyChainId.value == 0) {
    return "ACU";
  }
  return (buyAsset.value == "") ? $ethClient.chainsData[buyChainId.value]?.symbol : store.tokens[buyChainId.value][buyAsset.value].symbol;
});

const sellDecimals = computed(() => {
  if (sellChainId.value == null || sellAsset.value == null) {
    return null;
  }
  if (sellChainId.value == 0) {
    return 18;
  }
  return (sellAsset.value == "") ? 18 : store.tokens[sellChainId.value][sellAsset.value].decimals;
});

const buyDecimals = computed(() => {
  if (buyChainId.value == null || buyAsset.value == null) {
    return null;
  }
  if (buyChainId.value == 0) {
    return 18;
  }
  return (buyAsset.value == "") ? 18 : store.tokens[buyChainId.value][buyAsset.value].decimals;
});

const disabled = ref(false);
const setWaiting = ref(false);

const sellValue = ref("");
const sellPrice = ref("");
const sellTotal = computed(() => {
  if (sellValue.value == '' || sellPrice.value == '') {
    return ""
  }

  let sellValueWei = BigInt($ethClient.unformatWei(sellValue.value, sellDecimals.value));
  let sellPriceWei = BigInt($ethClient.unformatWei(sellPrice.value, buyDecimals.value));
  let buyValueWei = (sellValueWei * sellPriceWei) / (BigInt(10) ** BigInt(sellDecimals.value));

  return $ethClient.formatWei(buyValueWei.toString(), buyDecimals.value);
});

async function load() {
  if (sellChainId.value == null || sellAsset.value == null ||
    buyChainId.value == null || buyAsset.value == null) {
    return
  }

  console.log("sellAssetId:", sellAssetIdHex.value);
  console.log("buyAssetId:", buyAssetIdHex.value);

  try {
    let result = (await $acuityClient.api.query.orderbook.accountPairOrder(store.activeAcu, sellAssetIdHex.value, buyAssetIdHex.value)).unwrap();

    sellPrice.value = $ethClient.formatWei(result.price, buyDecimals.value);
    sellValue.value = $ethClient.formatWei(result.value, sellDecimals.value);
  }
  catch (e) {};
}

watch(sellChainId, async (newValue, oldValue) => {
  sellAsset.value = "";
  load();
});

watch(buyChainId, async (newValue, oldValue) => {
  buyAsset.value = "";
  load();
});

watch([sellAsset, buyAsset], async (newValue, oldValue) => {
  load();
});

async function set(event: any) {
  disabled.value = true;
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
          disabled.value = false;
        }
      });
  }
  catch (e) {
    setWaiting.value = false;
    disabled.value = false;
  }
}

async function unset(event: any) {
  disabled.value = true;
  const injector = await web3FromAddress(store.activeAcu);

  try {
    const unsub = await $acuityClient.api.tx.orderbook
      .removeOrder(sellAssetIdHex.value, buyAssetIdHex.value)
      .signAndSend(store.activeAcu, { signer: injector.signer }, (result: any) => {
        if (!result.status.isInBlock) {
          setWaiting.value = true;
        }
        else {
          unsub();
          load();
          setWaiting.value = false;
          disabled.value = false;
        }
      });
  }
  catch (e) {
    setWaiting.value = false;
    disabled.value = false;
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
        <v-select v-model="sellChainId" :items="store.chainSelect" label="Sell chain"></v-select>
        <v-select v-model="sellAsset" :items="sellAssetItems" label="Sell asset"></v-select>
        <v-select v-model="buyChainId" :items="store.chainSelect" label="Buy chain"></v-select>
        <v-select v-model="buyAsset" :items="buyAssetItems" label="Buy asset"></v-select>

        <v-card class="mb-10" :disabled="sellAssetIdHex == null || buyAssetIdHex == null || disabled">
          <v-toolbar color="blue">
            <v-toolbar-title>Sell order</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="sellPrice" label="Price" :suffix="buySymbol + ' / ' + sellSymbol"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="sellValue" label="Sell quantity" :suffix="sellSymbol"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-text-field v-model="sellTotal" readonly label="Buy quantity" :suffix="buySymbol"></v-text-field>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="success" @click="set">Set</v-btn>
            <!--<v-btn color="success" @click="unset">Unset</v-btn>-->
            <v-btn color="success" @click="reset">Reset</v-btn>
            <v-btn color="success" @click="goto">Goto</v-btn>
          </v-card-actions>
          <v-progress-linear :indeterminate="setWaiting" color="yellow darken-2"></v-progress-linear>
        </v-card>
        <v-alert type="info" variant="outlined" icon="mdi-cart-arrow-up" class="mt-8">
          Select an asset pair and publish your price and quantity for sale.
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>
