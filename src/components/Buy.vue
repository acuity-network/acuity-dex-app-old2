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

let sellAsset = ref('0');
let sellAssetItems: any = computed(() => {
  let assets = [];

  if (store.sellChainId == 0) {
    assets.push({
      title: "Acuity (ACU)",
      value: "0",
    })
  }
  else {
    assets.push({
      title: $ethClient.chainsData[store.sellChainId]?.label + " (" + $ethClient.chainsData[store.sellChainId]?.symbol + ")",
      value: "0",
    });

    let tokens = store.tokens[store.sellChainId];

    for (let address in tokens) {
      assets.push({
        title: tokens[address].name + " (" + tokens[address].symbol + ")",
        value: address,
      });
    }
  }

  return assets;
});

let buyAsset = ref('0');
let buyAssetItems: any = computed(() => {
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

const sellSymbol = computed(() => {

  if (store.sellChainId == 0) {
    return 'ACU';
  }

  return (sellAsset.value == "0") ? $ethClient.chainsData[store.sellChainId]?.symbol : store.tokens[store.sellChainId][sellAsset.value].symbol;

});

const buySymbol = computed(() => {
  if (store.buyChainId == 0) {
    return 'ACU';
  }

  return (buyAsset.value == "0") ? $ethClient.chainsData[store.buyChainId]?.symbol : store.tokens[store.buyChainId][buyAsset.value].symbol;
});

const sellDecimals = computed(() => {
  if (store.sellChainId == 0) {
    return 18;
  }

  return (sellAsset.value == "0") ? 18 : store.tokens[store.sellChainId][sellAsset.value].decimals;
});

const buyDecimals = computed(() => {
  if (store.buyChainId == 0) {
    return 18;
  }

  return (buyAsset.value == "0") ? 18 : store.tokens[store.buyChainId][buyAsset.value].decimals;
});

const sellOrders: Ref<any[]> = ref([]);


async function getAcuAddress(foreignAddress: string): Promise<string> {
  if (!store.sellChainId) return "";
  return encodeAddress(await $ethClient.chains[store.sellChainId].rpc.account.methods.getAcuAccount(foreignAddress).call());
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
  if (store.sellChainId == 0) {
    return getSubstrateAssetId();
  }
  else {
    return getEthereumAssetId(store.sellChainId, (sellAsset.value == "0") ? null : sellAsset.value);
  }
});

let buyAssetIdHex: any = computed(() => {
  if (store.buyChainId == 0) {
    return getSubstrateAssetId();
  }
  else {
    return getEthereumAssetId(store.buyChainId, (buyAsset.value == "0") ? null : buyAsset.value);
  }
});

async function load() {

  if (store.sellChainId === null || store.buyChainId === null) {
    return;
  }

/*
  if (!$ethClient.chains[store.sellChainId]) {
    return;
  }
*/
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

watch(() => store.sellChainId, async (newValue, oldValue) => {
  load();
});

watch(() => store.buyChainId, async (newValue, oldValue) => {
  load();
});

watch(sellAsset, async (newValue, oldValue) => {
  load();
});

watch(buyAsset, async (newValue, oldValue) => {
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
      <v-col cols="12" md="10">
        <v-select v-model="store.sellChainId" :items="chainSelect" label="Sell chain"></v-select>
        <v-select v-model="sellAsset" :items="sellAssetItems" label="Sell asset"></v-select>
        <v-select v-model="store.buyChainId" :items="chainSelect" label="Buy chain"></v-select>
        <v-select v-model="buyAsset" :items="buyAssetItems" label="Buy asset"></v-select>

        <v-table class="mb-10">
          <thead>
            <tr>
              <th class="text-left">
                Seller
              </th>
              <th class="text-right">
                Price ({{ buySymbol }} / {{ sellSymbol }})
              </th>
              <th class="text-right">
                Value ({{ sellSymbol }})
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
              <td class="text-right">{{ sellOrder.price }}</td>
              <td class="text-right">{{ sellOrder.value }}</td>
              <td class="text-right">{{ sellOrder.total }}</td>
              <td>
                <v-btn icon density="comfortable" @click="buy(sellOrder.account)">
                  <v-icon size="x-small">mdi-atom-variant</v-icon>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
</template>
