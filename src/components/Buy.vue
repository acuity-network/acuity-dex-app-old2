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

let sellChainId: Ref<number | null> = ref(null);
let sellAsset: Ref<string | null> = ref(null);
let buyChainId: Ref<number | null> = ref(null);
let buyAsset: Ref<string | null> = ref(null);

const sellOrders: Ref<any[]> = ref([]);

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

async function getAcuAddress(foreignAddress: string): Promise<string> {
  if (!sellChainId) return "";
  return encodeAddress(await $ethClient.chains[sellChainId].rpc.account.methods.getAcuAccount(foreignAddress).call());
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

async function load() {
  if (sellChainId.value == null || sellAsset.value == null ||
    buyChainId.value == null || buyAsset.value == null) {
    return
  }

  console.log("sellAssetId:", sellAssetIdHex.value);
  console.log("buyAssetId:", buyAssetIdHex.value);

  sellOrders.value = [];

  let orders = await $acuityClient.api.rpc.orderbook.getPairSellersOrders(sellAssetIdHex.value, buyAssetIdHex.value, 0, 100);

  let i = 0;
  while (i < orders[0].length) {
    let acuAddress = orders[0][i];
    let priceValue = orders[1][i];

    let result = (await $acuityClient.api.query.orderbook.accountPairOrder(acuAddress, sellAssetIdHex.value, buyAssetIdHex.value)).unwrap();

    let sellPriceWei = BigInt(result.price);
    let sellValueWei = BigInt(result.value);
    let buyValueWei = (sellValueWei * sellPriceWei) / (BigInt(10) ** BigInt(sellDecimals.value));

    let price = $ethClient.formatWei(sellPriceWei.toString(), buyDecimals.value);
    let value = $ethClient.formatWei(sellValueWei.toString(), sellDecimals.value);
    let total = $ethClient.formatWei(buyValueWei.toString(), buyDecimals.value);

    sellOrders.value.push({
      account: acuAddress,
      accountName: await loadName(acuAddress),
      price: price,
      value: value,
      total: total,
    });

    i++;
  }
}

onMounted(async () => {
  load();
})

watch(sellChainId, async (newValue, oldValue) => {
  if (sellAsset.value != "") {
    sellAsset.value = "";
  }
  else {
    load();
  }
});

watch(buyChainId, async (newValue, oldValue) => {
  if (buyAsset.value != "") {
    buyAsset.value = "";
  }
  else {
    load();
  }
});

watch([sellAsset, buyAsset], async (newValue, oldValue) => {
  load();
});

async function buy(accountId: string) {
  router.push({
    name: 'sell-order',
    params: {
      accountId: accountId,
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

        <v-table class="mb-10">
          <thead>
            <tr>
              <th class="text-left">
                Seller
              </th>
              <th class="text-right">
                Value ({{ sellSymbol }})
              </th>
              <th class="text-right">
                Price ({{ buySymbol }} / {{ sellSymbol }})
              </th>
              <th class="text-right">
                Total ({{ buySymbol }})
              </th>
              <th>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sellOrder in sellOrders">
              <td><router-link :to="'/account/' + sellOrder.account">{{ sellOrder.accountName }}</router-link></td>
              <td class="text-right">{{ sellOrder.value }}</td>
              <td class="text-right">{{ sellOrder.price }}</td>
              <td class="text-right">{{ sellOrder.total }}</td>
              <td>
                <v-btn icon density="comfortable" @click="buy(sellOrder.account)">
                  <v-icon size="x-small">mdi-atom-variant</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-alert type="info" variant="outlined" icon="mdi-cart-arrow-down" class="mt-8">
          Find a sell order you want to buy from.
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>
