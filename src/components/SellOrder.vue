<script setup lang="ts">
import { ref, reactive, inject, onMounted, computed, watch} from 'vue'
import { Buffer } from "buffer";
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
import erc20AbiJson from '../lib/contracts/ERC20.abi.json'

const erc20Abi: any = erc20AbiJson;

let $db: any = inject('$db');
let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let route = useRoute();
let router = useRouter();


const store = main();

const time = ref(0);
const locks: any = reactive({});

const sellerAccountId = ref("");
const sellerName = ref("");
const sellerTelegram = ref("");
const sellChainId = ref(0);
const sellToken = ref("");
const buyChainId = ref(0);
const buyToken = ref("");
const price = ref("");
const value = ref("");
const total = ref("");
const buyValue = ref("");

let sellPriceWei = BigInt(0);
let sellValueWei = BigInt(0);

const buyDisabled = ref(false);
const buyWaiting = ref(false);

const buyCost = computed(() => {

  let buyValueWei = BigInt($ethClient.unformatWei((buyValue.value != '') ? buyValue.value : '0', sellDecimals.value));
  let buyCostWei = (buyValueWei * sellPriceWei) / (BigInt(10) ** BigInt(sellDecimals.value));

  return $ethClient.formatWei(buyCostWei.toString(), buyDecimals.value);
});

let sellerAddressBuyChain: Ref<undefined | null | string> = ref(undefined);
let sellerAddressSellChain = ref("");

let dialogAllowanceBuy = ref(false);
let allowanceDisabledBuy = ref(false);
let allowanceCurrentBuy = ref("");
let allowanceNewBuy = ref("");
let allowanceWaitingBuy = ref(false);

let dialogAllowanceSell = ref(false);
let allowanceDisabledSell = ref(false);
let allowanceLockSell = ref("");
let allowanceCurrentSell = ref("");
let allowanceNewSell = ref("");
let allowanceWaitingSell = ref(false);

const sellSymbol = computed(() => {
  if (sellChainId.value == 0) {
    return 'ACU';
  }

  return (sellToken.value == "0x0000000000000000000000000000000000000000") ? $ethClient.chainsData[sellChainId.value]?.symbol : store.tokens[sellChainId.value][sellToken.value].symbol;
});

const buySymbol = computed(() => {
  if (buyChainId.value == 0) {
    return 'ACU';
  }

  return (buyToken.value == "0x0000000000000000000000000000000000000000") ? $ethClient.chainsData[buyChainId.value]?.symbol : store.tokens[buyChainId.value][buyToken.value].symbol;
});

const sellDecimals = computed(() => {
  if (sellChainId.value == 0) {
    return 18;
  }

  return (sellToken.value == "0x0000000000000000000000000000000000000000") ? 18 : store.tokens[sellChainId.value][sellToken.value].decimals;
});

const buyDecimals = computed(() => {
  if (buyChainId.value == 0) {
    return 18;
  }

  return (buyToken.value == "0x0000000000000000000000000000000000000000") ? 18 : store.tokens[buyChainId.value][buyToken.value].decimals;
});

const sellChain = computed(() => {
  if (sellChainId.value == 0) {
    return 'Acuity';
  }

  return $ethClient.chainsData[sellChainId.value].label;
});

const buyChain = computed(() => {
  if (buyChainId.value == 0) {
    return 'Acuity';
  }

  return $ethClient.chainsData[buyChainId.value].label
});

const sellAsset = computed(() => {
  if (sellChainId.value == 0) {
    return 'Acuity (ACU)';
  }

  let tokens = store.tokens[sellChainId.value];

  return (sellToken.value == "0x0000000000000000000000000000000000000000") ?
    ($ethClient.chainsData[sellChainId.value].label + ' (' + $ethClient.chainsData[sellChainId.value].symbol + ')') :
    (tokens[sellToken.value].name + ' (' + tokens[sellToken.value].symbol + ')');
});

const buyAsset = computed(() => {
  if (buyChainId.value == 0) {
    return 'Acuity (ACU)';
  }

  let tokens = store.tokens[buyChainId.value];

  return (buyToken.value == "0x0000000000000000000000000000000000000000") ?
    ($ethClient.chainsData[buyChainId.value].label + ' (' + $ethClient.chainsData[buyChainId.value].symbol + ')') :
    (tokens[buyToken.value].name + ' (' + tokens[buyToken.value].symbol + ')');
});

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

async function loadTelegram(address: string): Promise<string> {
  try {
    let result = await $acuityClient.api.query.identity.identityOf(address);
    let info = result.unwrap().info;
    return $ethClient.web3.utils.hexToAscii(JSON.parse(info.additional.toString())[0][1].raw);
  }
  catch (e) {
    return 'unknown';
  }
}

function getLockId(returnValues: any) {
  let creator = $ethClient.web3.utils.padLeft(returnValues.creator, 64).slice(2);
  let recipient = $ethClient.web3.utils.padLeft(returnValues.recipient, 64).slice(2);
  let hashedSecret = returnValues.hashedSecret.slice(2);
  let timeout = $ethClient.web3.utils.padLeft($ethClient.web3.utils.numberToHex(returnValues.timeout), 64).slice(2);
  return $ethClient.web3.utils.keccak256('0x' + creator + recipient + hashedSecret + timeout);
}

function getTokenLockId(returnValues: any) {
  let token = $ethClient.web3.utils.padLeft(returnValues.token, 64).slice(2);
  let creator = $ethClient.web3.utils.padLeft(returnValues.creator, 64).slice(2);
  let recipient = $ethClient.web3.utils.padLeft(returnValues.recipient, 64).slice(2);
  let hashedSecret = returnValues.hashedSecret.slice(2);
  let timeout = $ethClient.web3.utils.padLeft($ethClient.web3.utils.numberToHex(returnValues.timeout), 64).slice(2);
  return $ethClient.web3.utils.keccak256('0x' + token + creator + recipient + hashedSecret + timeout);
}

async function load() {
  let newLocks: any = {};

  let buyHeight;
  let sellHeight;

  if (buyChainId.value) {
    buyHeight = await $ethClient.chains[buyChainId.value].rpc.web3.eth.getBlockNumber();
  }
  if (sellChainId.value) {
    sellHeight = await $ethClient.chains[sellChainId.value].rpc.web3.eth.getBlockNumber();
  }

  for await (const [key, json] of $db.iterator({
    gt: '/locks/' + route.params.accountId + '/' + route.params.sellAssetId + '/' + route.params.buyAssetId + '/',
    lt: '/locks/' + route.params.accountId + '/' + route.params.sellAssetId + '/' + route.params.buyAssetId + '/z',
  })) {
    let lock = JSON.parse(json);
    newLocks[lock.lockId] = lock;
  }

  // 0 for base coin, otherwise ERC20
  let buyType = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(18, 22));

  if (buyChainId.value == 0) {
    // Find buy locks on Acuity with with the sellers ACU address as recipient.
    let blockNumbers = await $acuityClient.api.rpc.atomicSwap.getIndexBlocks(route.params.accountId);

    for (let blockNumber of blockNumbers) {
      try {
        const blockHash = await $acuityClient.api.rpc.chain.getBlockHash(blockNumber);
        const apiAt = await $acuityClient.api.at(blockHash);
        const events = await apiAt.query.system.events();

        for (let event of events) {
          if (event.event.section == 'atomicSwap' && event.event.method == 'LockBuy') {
            if ($ethClient.web3.utils.bytesToHex(event.event.data[6]) != (route.params.sellAssetId as string).toLowerCase()) {   // correct sell assetId
              continue;
            }
            let lockId = $ethClient.web3.utils.bytesToHex(event.event.data[5]);

            if (lockId in newLocks) continue;

            let sellChainIdHex = '0x0002';
            sellChainIdHex += $ethClient.web3.utils.stripHexPrefix($ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(sellChainId.value), 12));
            let result = (await $acuityClient.api.query.orderbook.accountForeignAccount(encodeAddress(event.event.data[0]), sellChainIdHex)).unwrap();
            let sellAddress = '0x' + Buffer.from(result).toString('hex').slice(24);

            // Calculate how much value the sell lock should have.
            let buyLockValueWei = BigInt(event.event.data[4]);
            let buyLockPriceWei = BigInt(event.event.data[7]);
            let sellLockValueWei = (buyLockValueWei * (BigInt(10) ** BigInt(sellDecimals.value))) / buyLockPriceWei;

            newLocks[lockId] = {
              lockId: lockId,
              secret: "",
              hashedSecret: $ethClient.web3.utils.bytesToHex(event.event.data[2]),
              buyerAddressBuyChain: encodeAddress(event.event.data[0]),
              buyerAddressSellChain: sellAddress,
              buyerName: await loadName(encodeAddress(event.event.data[0])),
              buyLockValue: $ethClient.formatWei(event.event.data[4], buyDecimals.value),
              buyLockPrice: $ethClient.formatWei(event.event.data[7], buyDecimals.value),
              buyLockState: "Locked",
              buyLockTimeoutRaw: parseInt(event.event.data[3]),
              buyLockTimeoutMS: parseInt(event.event.data[3]),
              buyLockTimeout: new Date(parseInt(event.event.data[3])).toLocaleString(),
              sellLockValueWei: sellLockValueWei.toString(),
              sellLockValue: $ethClient.formatWei(sellLockValueWei.toString(), sellDecimals.value),
              sellLockState: "Not locked",
              createSellLockDisabled: false,
              createSellLockWaiting: false,
              unlockSellLockDisabled: false,
              unlockSellLockWaiting: false,
              timeoutSellLockDisabled: false,
              timeoutSellLockWaiting: false,
              unlockBuyLockDisabled: false,
              unlockBuyLockWaiting: false,
              timeoutBuyLockDisabled: false,
              timeoutBuyLockWaiting: false,
            };
          }
        }
      }
      catch (e) {}
    }
  }
  else {
    let events;

    if (buyType == 0) {
      events = await $ethClient.chains[buyChainId.value].rpc.atomicSwap.getPastEvents('LockBuy', {
        fromBlock: Math.max(buyHeight - 980, 0),
        filter: {
          recipient: sellerAddressBuyChain.value,
        },
      });
    }
    else {
      events = await $ethClient.chains[buyChainId.value].rpc.atomicSwapERC20.getPastEvents('LockBuy', {
        fromBlock: Math.max(buyHeight - 980, 0),
        filter: {
          token: buyToken.value,
          recipient: sellerAddressBuyChain.value,
        },
      });
    }

    for (let event of events) {
      if (event.returnValues.sellAssetId != (route.params.sellAssetId as string).toLowerCase()) {   // correct sell assetId
        continue;
      }
      let lockId;
      if (buyType == 0) {
        lockId = getLockId(event.returnValues);
      }
      else {
        lockId = getTokenLockId(event.returnValues);
      }

      let buyerAcuAddress = encodeAddress(await $ethClient.chains[buyChainId.value].rpc.account.methods.getAcuAccount(event.returnValues.creator).call());

      let sellAddress;
      if (sellChainId.value == 0) {
        sellAddress = buyerAcuAddress;
      }
      else {
        let sellChainIdHex = '0x0002';
        sellChainIdHex += $ethClient.web3.utils.stripHexPrefix($ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(sellChainId.value), 12));
        let result = (await $acuityClient.api.query.orderbook.accountForeignAccount(buyerAcuAddress, sellChainIdHex)).unwrap();
        sellAddress = '0x' + Buffer.from(result).toString('hex').slice(24);
      }

      // Calculate how much value the sell lock should have.
      let buyLockValueWei = BigInt(event.returnValues.value);
      let buyLockPriceWei = BigInt(event.returnValues.sellPrice);
      let sellLockValueWei = (buyLockValueWei * (BigInt(10) ** BigInt(sellDecimals.value))) / buyLockPriceWei;

      newLocks[lockId] = {
        lockId: lockId,
        secret: "",
        hashedSecret: event.returnValues.hashedSecret,
        buyerAddressBuyChain: event.returnValues.creator.toLowerCase(),
        buyerAddressSellChain: sellAddress,
        buyerName: await loadName(buyerAcuAddress),
        buyLockValue: $ethClient.formatWei(event.returnValues.value, buyDecimals.value),
        buyLockPrice: $ethClient.formatWei(event.returnValues.sellPrice, buyDecimals.value),
        buyLockState: "Locked",
        buyLockTimeoutRaw: parseInt(event.returnValues.timeout),
        buyLockTimeoutMS: parseInt(event.returnValues.timeout) * 1000,
        buyLockTimeout: new Date(event.returnValues.timeout * 1000).toLocaleString(),
        sellLockValueWei: sellLockValueWei.toString(),
        sellLockValue: $ethClient.formatWei(sellLockValueWei.toString(), sellDecimals.value),
        sellLockState: "Not locked",
        createSellLockDisabled: false,
        createSellLockWaiting: false,
        unlockSellLockDisabled: false,
        unlockSellLockWaiting: false,
        timeoutSellLockDisabled: false,
        timeoutSellLockWaiting: false,
        unlockBuyLockDisabled: false,
        unlockBuyLockWaiting: false,
        timeoutBuyLockDisabled: false,
        timeoutBuyLockWaiting: false,
      };
    }
  }

  // 0 for base coin, otherwise ERC20
  let sellType = $ethClient.web3.utils.hexToNumber('0x' + route.params.sellAssetId.slice(18, 22));
  let events;

  if (sellChainId.value == 0) {
    let blockNumbers = await $acuityClient.api.rpc.atomicSwap.getIndexBlocks(sellerAddressSellChain.value);

    for (let blockNumber of blockNumbers) {
      try {
        const blockHash = await $acuityClient.api.rpc.chain.getBlockHash(blockNumber);
        const apiAt = await $acuityClient.api.at(blockHash);
        const events = await apiAt.query.system.events();

        for (let event of events) {
          if (event.event.section == 'atomicSwap' && event.event.method == 'LockSell') {
            if (event.event.data[6] != (route.params.buyAssetId as string).toLowerCase()) {   // correct sell assetId
              continue;
            }

            let buyLockId = $ethClient.web3.utils.bytesToHex(event.event.data[7]);

            if (newLocks[buyLockId]) {
              newLocks[buyLockId].sellLockId = $ethClient.web3.utils.bytesToHex(event.event.data[5]);
              newLocks[buyLockId].sellLockState = "Locked";
              newLocks[buyLockId].sellLockTimeoutRaw = parseInt(event.event.data[3]);
              newLocks[buyLockId].sellLockTimeoutMS = parseInt(event.event.data[3]);
              newLocks[buyLockId].sellLockTimeout = new Date(parseInt(event.event.data[3])).toLocaleString();
            }
          }

          if (event.event.section == 'atomicSwap' && event.event.method == 'Unlock') {
            let sellLockId = $ethClient.web3.utils.bytesToHex(event.event.data[2]);

            for (let lockId in newLocks) {
              if (newLocks[lockId].sellLockId == sellLockId) {
                newLocks[lockId].secret = $ethClient.web3.utils.bytesToHex(event.event.data[3]);
                newLocks[lockId].sellLockState = "Unlocked";
              }
            }
          }

          if (event.event.section == 'atomicSwap' && event.event.method == 'Retrieve') {
            let sellLockId = $ethClient.web3.utils.bytesToHex(event.event.data[2]);

            for (let lockId in newLocks) {
              if (newLocks[lockId].sellLockId == sellLockId) {
                newLocks[lockId].sellLockState = "Timed out";
              }
            }
          }
        }
      }
      catch (e) {}
    }
  }
  else {
    if (sellType == 0) {
      events = await $ethClient.chains[sellChainId.value].rpc.atomicSwap.getPastEvents('LockSell', {
        fromBlock: Math.max(sellHeight - 980, 0),
        filter: {
          creator: sellerAddressSellChain.value,
        },
      });
    }
    else {
      events = await $ethClient.chains[sellChainId.value].rpc.atomicSwapERC20.getPastEvents('LockSell', {
        fromBlock: Math.max(sellHeight - 980, 0),
        filter: {
          token: sellToken.value,
          creator: sellerAddressSellChain.value,
        },
      });
    }

    for (let event of events) {
      let buyLockId = event.returnValues.buyLockId;
      if (newLocks[buyLockId]) {
        if (event.returnValues.buyAssetId != (route.params.buyAssetId as string).toLowerCase()) {   // correct sell assetId
          continue;
        }
        if (newLocks[buyLockId].sellLockValueWei != BigInt(event.returnValues.value)) {
          console.log("Sell lock has incorrect value.")
          continue;
        }

        let lockId;
        if (sellType == 0) {
          newLocks[buyLockId].sellLockId = getLockId(event.returnValues);
        }
        else {
          newLocks[buyLockId].sellLockId = getTokenLockId(event.returnValues);
        }
        newLocks[buyLockId].sellLockState = "Locked";
        newLocks[buyLockId].sellLockTimeoutRaw = parseInt(event.returnValues.timeout);
        newLocks[buyLockId].sellLockTimeoutMS = parseInt(event.returnValues.timeout) * 1000;
        newLocks[buyLockId].sellLockTimeout = new Date(parseInt(event.returnValues.timeout) * 1000).toLocaleString();
      }
    }

    if (sellType == 0) {
      events = await $ethClient.chains[sellChainId.value].rpc.atomicSwap.getPastEvents('Unlock', {
        fromBlock: Math.max(sellHeight - 980, 0),
        filter: {
          creator: sellerAddressSellChain.value,
        },
      });
    }
    else {
      events = await $ethClient.chains[sellChainId.value].rpc.atomicSwapERC20.getPastEvents('Unlock', {
        fromBlock: Math.max(sellHeight - 980, 0),
        filter: {
          token: sellToken.value,
          creator: sellerAddressSellChain.value,
        },
      });
    }

    for (let event of events) {
      // Find the buy lock.
      for (let lockId in newLocks) {
        if (newLocks[lockId].sellLockId == event.returnValues.lockId) {
          newLocks[lockId].secret = event.returnValues.secret;
          newLocks[lockId].sellLockState = "Unlocked";
        }
      }
    }

    if (sellType == 0) {
      events = await $ethClient.chains[sellChainId.value].rpc.atomicSwap.getPastEvents('Retrieve', {
        fromBlock: Math.max(sellHeight - 980, 0),
        filter: {
          creator: sellerAddressSellChain.value,
        },
      });
    }
    else {
      events = await $ethClient.chains[sellChainId.value].rpc.atomicSwapERC20.getPastEvents('Retrieve', {
        fromBlock: Math.max(sellHeight - 980, 0),
        filter: {
          token: sellToken.value,
          creator: sellerAddressSellChain.value,
        },
      });
    }

    for (let event of events) {
      // Find the buy lock.
      for (let lockId in newLocks) {
        if (newLocks[lockId].sellLockId == event.returnValues.lockId) {
          newLocks[lockId].secret = event.returnValues.secret;
          newLocks[lockId].sellLockState = "Timed out";
        }
      }
    }
  }

  if (buyChainId.value == 0) {
    let blockNumbers = await $acuityClient.api.rpc.atomicSwap.getIndexBlocks(sellerAddressBuyChain.value);

    for (let blockNumber of blockNumbers) {
      try {
        const blockHash = await $acuityClient.api.rpc.chain.getBlockHash(blockNumber);
        const apiAt = await $acuityClient.api.at(blockHash);
        const events = await apiAt.query.system.events();

        for (let event of events) {
          if (event.event.section == 'atomicSwap' && event.event.method == 'Unlock') {
            let lockId = $ethClient.web3.utils.bytesToHex(event.event.data[2]);

            if (newLocks[lockId]) {
              newLocks[lockId].buyLockState = "Unlocked";
            }
          }

          if (event.event.section == 'atomicSwap' && event.event.method == 'Retrieve') {
            let lockId = $ethClient.web3.utils.bytesToHex(event.event.data[2]);

            if (newLocks[lockId]) {
              newLocks[lockId].buyLockState = "Timed out";
            }
          }
        }
      }
      catch (e) {}
    }
  }
  else {
    if (buyType == 0) {
      events = await $ethClient.chains[buyChainId.value].rpc.atomicSwap.getPastEvents('Unlock', {
        fromBlock: Math.max(buyHeight - 980, 0),
        filter: {
          recipient: sellerAddressBuyChain.value,
        },
      });
    }
    else {
      events = await $ethClient.chains[buyChainId.value].rpc.atomicSwapERC20.getPastEvents('Unlock', {
        fromBlock: Math.max(buyHeight - 980, 0),
        filter: {
          token: buyToken.value,
          recipient: sellerAddressBuyChain.value,
        },
      });
    }

    for (let event of events) {
      if (newLocks[event.returnValues.lockId]) {
        newLocks[event.returnValues.lockId].buyLockState = "Unlocked";
      }
    }

    if (buyType == 0) {
      events = await $ethClient.chains[buyChainId.value].rpc.atomicSwap.getPastEvents('Retrieve', {
        fromBlock: Math.max(buyHeight - 980, 0),
        filter: {
          recipient: sellerAddressBuyChain.value,
        },
      });
    }
    else {
      events = await $ethClient.chains[buyChainId.value].rpc.atomicSwapERC20.getPastEvents('Retrieve', {
        fromBlock: Math.max(buyHeight - 980, 0),
        filter: {
          token: buyToken.value,
          recipient: sellerAddressBuyChain.value,
        },
      });
    }

    for (let event of events) {
      if (newLocks[event.returnValues.lockId]) {
        newLocks[event.returnValues.lockId].buyLockState = "Timed out";
      }
    }
  }

  for (let lockId in newLocks) {
    locks[lockId] = newLocks[lockId];
    $db.put('/locks/' + route.params.accountId + '/' + route.params.sellAssetId + '/' + route.params.buyAssetId + '/' + lockId, JSON.stringify(newLocks[lockId]));
  }
}

let buyEmitter;
let sellEmitter;
let buyEmitterERC20;
let sellEmitterERC20;

onMounted(async () => {
  // Update time once per second.
  setInterval(() => {
    time.value = Date.now();
  }, 1000);
  time.value = Date.now();

  sellerAccountId.value = route.params.accountId as string;
  sellerName.value = await loadName(sellerAccountId.value);
  sellerTelegram.value = await loadTelegram(sellerAccountId.value);
  sellChainId.value = $ethClient.web3.utils.hexToNumber('0x' + route.params.sellAssetId.slice(6, 18));
  sellToken.value = '0x' + route.params.sellAssetId.slice(26, 66);
  buyChainId.value = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(6, 18));
  buyToken.value = '0x' + route.params.buyAssetId.slice(26, 66);

  // Get seller address on sell chain.
  if (sellChainId.value == 0) {
    sellerAddressSellChain.value = sellerAccountId.value;
  }
  else {
    let chainIdHex = '0x0002';
    chainIdHex += $ethClient.web3.utils.stripHexPrefix($ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(sellChainId.value), 12));
    let result = (await $acuityClient.api.query.orderbook.accountForeignAccount(sellerAccountId.value, chainIdHex)).unwrap();
    sellerAddressSellChain.value = '0x' + Buffer.from(result).toString('hex').slice(24);
  }

  // Get seller address on buy chain.
  if (buyChainId.value == 0) {
    sellerAddressBuyChain.value = sellerAccountId.value;
  }
  else {
    let chainIdHex = '0x0002';
    chainIdHex += $ethClient.web3.utils.stripHexPrefix($ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(buyChainId.value), 12));
    try {
      let result = (await $acuityClient.api.query.orderbook.accountForeignAccount(sellerAccountId.value, chainIdHex)).unwrap();
      sellerAddressBuyChain.value = '0x' + Buffer.from(result).toString('hex').slice(24);
    }
    catch (e) {
      sellerAddressBuyChain.value = null;
    }
  }

  let result = (await $acuityClient.api.query.orderbook.accountPairOrder(route.params.accountId, route.params.sellAssetId, route.params.buyAssetId)).unwrap();

  sellPriceWei = BigInt(result.price);
  sellValueWei = BigInt(result.value);
  let buyValueWei = (sellValueWei * sellPriceWei) / (BigInt(10) ** BigInt(sellDecimals.value));

  price.value = $ethClient.formatWei(result.price, buyDecimals.value);
  value.value = $ethClient.formatWei(result.value, sellDecimals.value);
  total.value = $ethClient.formatWei(buyValueWei.toString(), buyDecimals.value);

  $acuityClient.api.query.system.events((events: any) => {
    // Loop through the Vec<EventRecord>
    events.forEach((record: any) => {
      // Extract the phase, event and the event types
      const { event, phase } = record;
      if (event.section == 'atomicSwap') {
        load();
      }
    });
  });

  if (buyChainId.value) {
    buyEmitter = $ethClient.chains[buyChainId.value].ws.atomicSwap.events.allEvents()
    .on('data', function(event: any){
      load();
    });

    buyEmitterERC20 = $ethClient.chains[buyChainId.value].ws.atomicSwapERC20.events.allEvents()
    .on('data', function(event: any){
      load();
    });
  }

  if (sellChainId.value) {
    sellEmitter = $ethClient.chains[sellChainId.value].ws.atomicSwap.events.allEvents()
    .on('data', function(event: any){
      load();
    });

    sellEmitterERC20 = $ethClient.chains[sellChainId.value].ws.atomicSwapERC20.events.allEvents()
    .on('data', function(event: any){
      load();
    });
  }

  load();
});

/**
 * Called by buyer.
 */
async function createBuyLock(event: any) {
  buyDisabled.value = true;

  let recipient = sellerAddressBuyChain.value;
  let secret = $ethClient.web3.utils.randomHex(32);
  let hashedSecret = $ethClient.web3.utils.keccak256(secret);
  $db.put('/secrets/' + hashedSecret, secret);
  let timeoutRaw = BigInt(Date.now()) + BigInt(60 * 60 * 3 * 1000);   // 3 hours

  let buyValueWei = BigInt($ethClient.unformatWei(buyValue.value, sellDecimals.value));
  let value = ((buyValueWei * sellPriceWei) / (BigInt(10) ** BigInt(sellDecimals.value))).toString();

  let sellAssetId = route.params.sellAssetId
  let sellPrice = sellPriceWei.toString();

  if (buyChainId.value == 0) {
    let timeout = timeoutRaw.toString();
    console.log({recipient, hashedSecret, timeout, value, sellAssetId, sellPrice});
    const injector = await web3FromAddress(store.activeAcu);
    try {
      const unsub = await $acuityClient.api.tx.atomicSwap
        .lockBuy(recipient, hashedSecret, timeout, value, sellAssetId, sellPrice)
        .signAndSend(store.activeAcu, { signer: injector.signer }, (result: any) => {
          console.log(result);
          if (!result.status.isInBlock) {
            buyWaiting.value = true;
          }
          else {
            unsub();
            load();
            buyWaiting.value = false;
            buyDisabled.value = false;
          }
        });
    }
    catch (e) {
      buyWaiting.value = false;
      buyDisabled.value = false;
    }

    return;
  }

  // Ensure MetaMask is on the correct chain.
  if (store.metaMaskChainId != buyChainId.value) {
    try {
      await $ethClient.switchEthereumChain(buyChainId.value);
    }
    catch (e) {
      buyDisabled.value = false;
      return;
    }
  }

  let timeout = (timeoutRaw / BigInt(1000)).toString();
  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(18, 22));

  if (type == 0) {
    console.log({recipient, hashedSecret, timeout, sellAssetId, sellPrice, value});

    $ethClient.atomicSwap.methods
      .lockBuy(recipient, hashedSecret, timeout, sellAssetId, sellPrice)
      .send({from: store.metaMaskAccount, value: value})
      .on('transactionHash', function(payload: any) {
        buyWaiting.value = true;
      })
      .on('receipt', function(receipt: any) {
        buyWaiting.value = false;
        buyDisabled.value = false;
      })
      .on('error', function(error: any) {
        buyWaiting.value = false;
        buyDisabled.value = false;
      });
  }
  else {
    let tokenAddress = '0x' + route.params.buyAssetId.slice(26, 66);

    // Ensure token allowance is big enough.
    let token = new $ethClient.chains[buyChainId.value].rpc.web3.eth.Contract(erc20Abi, tokenAddress);
    let contractAddress = $ethClient.chainsData[buyChainId.value].contracts.atomicSwapERC20;
    let allowance = await token.methods.allowance(store.metaMaskAccount, contractAddress).call();

    if (BigInt(value) > BigInt(allowance)) {
      allowanceDisabledBuy.value = false;
      allowanceCurrentBuy.value = $ethClient.formatWei(allowance, buyDecimals.value),
      allowanceNewBuy.value = buyCost.value;
      allowanceWaitingBuy.value = false;
      dialogAllowanceBuy.value = true;

      await new Promise<void>((resolve) => {
        const unwatch = watch(dialogAllowanceBuy, (newVal) => {
          if (newVal == false) {
            unwatch();
            resolve();
          }
        });
      });

      allowance = await token.methods.allowance(store.metaMaskAccount, contractAddress).call();
      if (BigInt(value) > BigInt(allowance)) {
        buyDisabled.value = false;
        return;
      }
    }

    console.log({tokenAddress, recipient, hashedSecret, timeout, value, sellAssetId, sellPrice});
    $ethClient.atomicSwapERC20.methods
      .lockBuy(tokenAddress, recipient, hashedSecret, timeout, value, sellAssetId, sellPrice)
      .send({from: store.metaMaskAccount})
      .on('transactionHash', function(payload: any) {
        buyWaiting.value = true;
      })
      .on('receipt', function(receipt: any) {
        buyWaiting.value = false;
        buyDisabled.value = false;
      })
      .on('error', function(error: any) {
        buyWaiting.value = false;
        buyDisabled.value = false;
      });
  }
}

async function approveAllowanceBuy(event: any) {
  allowanceDisabledBuy.value = true;
  let tokenAddress = '0x' + route.params.buyAssetId.slice(26, 66);
  let token = new $ethClient.web3.eth.Contract(erc20Abi, tokenAddress);
  let contractAddress = $ethClient.chainsData[buyChainId.value].contracts.atomicSwapERC20;
  let allowance = $ethClient.unformatWei(allowanceNewBuy.value, buyDecimals.value).toString();

  console.log({tokenAddress, contractAddress, allowance});
  token.methods
    .approve(contractAddress, allowance)
    .send({from: store.metaMaskAccount})
    .on('transactionHash', function(payload: any) {
      allowanceWaitingBuy.value = true;
    })
    .on('receipt', function(receipt: any) {
      allowanceWaitingBuy.value = false;
      allowanceDisabledBuy.value = false;
      dialogAllowanceBuy.value = false;
      load();
    })
    .on('error', function(error: any) {
      console.error(error);
      allowanceWaitingBuy.value = false;
      allowanceDisabledBuy.value = false;
      dialogAllowanceBuy.value = false;
    });
}

/**
 * Called by seller.
 */
async function createSellLock(lock: any) {
  locks[lock.lockId].createSellLockDisabled = true;

  let recipient = lock.buyerAddressSellChain;
  let hashedSecret = lock.hashedSecret;
  let timeoutRaw = BigInt(Date.now()) + BigInt(60 * 60 * 2 * 1000);   // 2 hours
  let buyAssetId = route.params.buyAssetId;
  let value = lock.sellLockValueWei.toString();
  let buyLockId = lock.lockId;

  if (sellChainId.value == 0) {
    let timeout = timeoutRaw.toString();
    console.log({recipient, hashedSecret, timeout, value, buyAssetId, buyLockId});
    const injector = await web3FromAddress(sellerAddressSellChain.value);
    try {
      const unsub = await $acuityClient.api.tx.atomicSwap
        .lockSell(recipient, hashedSecret, timeout, value, buyAssetId, buyLockId)
        .signAndSend(sellerAddressSellChain.value, { signer: injector.signer }, (result: any) => {
          console.log(result);
          if (!result.status.isInBlock) {
            locks[lock.lockId].createSellLockWaiting = true;
          }
          else {
            unsub();
            load();
            locks[lock.lockId].createSellLockWaiting = false;
            locks[lock.lockId].createSellLockDisabled = false;
          }
        });
    }
    catch (e) {
      locks[lock.lockId].createSellLockWaiting = false;
      locks[lock.lockId].createSellLockDisabled = false;
    }
    return;
  }

  // Ensure MetaMask is on the correct chain.
  if (store.metaMaskChainId != sellChainId.value) {
    try {
      await $ethClient.switchEthereumChain(sellChainId.value);
    }
    catch (e) {
      locks[lock.lockId].createSellLockDisabled = false;
      return;
    }
  }

  let timeout = (timeoutRaw / BigInt(1000)).toString();
  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.sellAssetId.slice(18, 22));

  if (type == 0) {
    console.log({recipient, hashedSecret, timeout, buyAssetId, buyLockId, value});

    $ethClient.atomicSwap.methods
      .lockSell(recipient, hashedSecret, timeout, buyAssetId, buyLockId)
      .send({from: store.metaMaskAccount, value: value})
      .on('transactionHash', function(payload: any) {
        locks[lock.lockId].createSellLockWaiting = true;
      })
      .on('receipt', function(receipt: any) {
        locks[lock.lockId].createSellLockWaiting = false;
        locks[lock.lockId].createSellLockDisabled = false;
      })
      .on('error', function(error: any) {
        locks[lock.lockId].createSellLockWaiting = false;
        locks[lock.lockId].createSellLockDisabled = false;
      });
    }
    else {
      let tokenAddress = '0x' + route.params.sellAssetId.slice(26, 66);

      // Ensure token allowance is big enough.
      let token = new $ethClient.chains[sellChainId.value].rpc.web3.eth.Contract(erc20Abi, tokenAddress);
      let contractAddress = $ethClient.chainsData[sellChainId.value].contracts.atomicSwapERC20;
      let allowance = await token.methods.allowance(store.metaMaskAccount, contractAddress).call();

      if (BigInt(value) > BigInt(allowance)) {
        allowanceDisabledSell.value = false;
        allowanceLockSell.value = $ethClient.formatWei(value, sellDecimals.value),
        allowanceCurrentSell.value = $ethClient.formatWei(allowance, sellDecimals.value),
        allowanceNewSell.value = "";
        allowanceWaitingSell.value = false;
        dialogAllowanceSell.value = true;

        await new Promise<void>((resolve) => {
          const unwatch = watch(dialogAllowanceSell, (newVal) => {
            if (newVal == false) {
              unwatch();
              resolve();
            }
          });
        });

        allowance = await token.methods.allowance(store.metaMaskAccount, contractAddress).call();
        if (BigInt(value) > BigInt(allowance)) {
          locks[lock.lockId].createSellLockDisabled = false;
          return;
        }
      }

      console.log({tokenAddress, recipient, hashedSecret, timeout, value, buyAssetId, buyLockId});
      $ethClient.atomicSwapERC20.methods
        .lockSell(tokenAddress, recipient, hashedSecret, timeout, value, buyAssetId, buyLockId)
        .send({from: store.metaMaskAccount})
        .on('transactionHash', function(payload: any) {
          locks[lock.lockId].createSellLockWaiting = true;
        })
        .on('receipt', function(receipt: any) {
          locks[lock.lockId].createSellLockWaiting = false;
          locks[lock.lockId].createSellLockDisabled = false;
        })
        .on('error', function(error: any) {
          locks[lock.lockId].createSellLockWaiting = false;
          locks[lock.lockId].createSellLockDisabled = false;
        });
    }
}

async function approveAllowanceSell(event: any) {
  allowanceDisabledSell.value = true;
  let tokenAddress = '0x' + route.params.sellAssetId.slice(26, 66);
  let token = new $ethClient.web3.eth.Contract(erc20Abi, tokenAddress);
  let contractAddress = $ethClient.chainsData[sellChainId.value].contracts.atomicSwapERC20;
  let allowance = $ethClient.unformatWei(allowanceNewSell.value, sellDecimals.value).toString();

  console.log({tokenAddress, contractAddress, allowance});
  token.methods
    .approve(contractAddress, allowance)
    .send({from: store.metaMaskAccount})
    .on('transactionHash', function(payload: any) {
      allowanceWaitingSell.value = true;
    })
    .on('receipt', function(receipt: any) {
      allowanceWaitingSell.value = false;
      allowanceDisabledSell.value = false;
      dialogAllowanceSell.value = false;
      load();
    })
    .on('error', function(error: any) {
      console.error(error);
      allowanceWaitingSell.value = false;
      allowanceDisabledSell.value = false;
      dialogAllowanceSell.value = false;
    });
}

/**
 * Called by buyer, revealing secret.
 */
async function unlockSellLock(lock: any) {
  locks[lock.lockId].unlockSellLockDisabled = true;

  let sender = sellerAddressSellChain.value;
  let secret = await $db.get('/secrets/' + lock.hashedSecret);
  let timeout = lock.sellLockTimeoutRaw;

  if (sellChainId.value == 0) {
    console.log({sender, secret, timeout});
    const injector = await web3FromAddress(lock.buyerAddressSellChain);
    try {
      const unsub = await $acuityClient.api.tx.atomicSwap
        .unlock(sender, secret, timeout)
        .signAndSend(lock.buyerAddressSellChain, { signer: injector.signer }, (result: any) => {
          console.log(result);
          if (!result.status.isInBlock) {
            locks[lock.lockId].unlockSellLockWaiting = true;
          }
          else {
            unsub();
            load();
            locks[lock.lockId].unlockSellLockWaiting = false;
            locks[lock.lockId].unlockSellLockDisabled = false;
          }
        });
    }
    catch (e) {
      locks[lock.lockId].unlockSellLockWaiting = false;
      locks[lock.lockId].unlockSellLockDisabled = false;
      console.log(e);
    }

    return;
  }

  // Ensure MetaMask is on the correct chain.
  if (store.metaMaskChainId != sellChainId.value) {
    try {
      await $ethClient.switchEthereumChain(sellChainId.value);
    }
    catch (e) {
      locks[lock.lockId].unlockSellLockDisabled = false;
      return;
    }
  }

  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.sellAssetId.slice(18, 22));

  if (type == 0) {
    console.log({sender, secret, timeout});

    $ethClient.atomicSwap.methods
      .unlock(sender, secret, timeout)
      .send({from: store.metaMaskAccount})
      .on('transactionHash', function(payload: any) {
        locks[lock.lockId].unlockSellLockWaiting = true;
      })
      .on('receipt', function(receipt: any) {
        locks[lock.lockId].unlockSellLockWaiting = false;
        locks[lock.lockId].unlockSellLockDisabled = false;
      })
      .on('error', function(error: any) {
        locks[lock.lockId].unlockSellLockWaiting = false;
        locks[lock.lockId].unlockSellLockDisabled = false;
      });
  }
  else {
    let token = '0x' + route.params.sellAssetId.slice(26, 66);
    console.log({token, sender, secret, timeout});

    $ethClient.atomicSwapERC20.methods
      .unlock(token, sender, secret, timeout)
      .send({from: store.metaMaskAccount})
      .on('transactionHash', function(payload: any) {
        locks[lock.lockId].unlockSellLockWaiting = true;
      })
      .on('receipt', function(receipt: any) {
        locks[lock.lockId].unlockSellLockWaiting = false;
        locks[lock.lockId].unlockSellLockDisabled = false;
      })
      .on('error', function(error: any) {
        locks[lock.lockId].unlockSellLockWaiting = false;
        locks[lock.lockId].unlockSellLockDisabled = false;
      });
  }
}

/**
 * Called by seller.
 */
async function unlockBuyLock(lock: any) {
  locks[lock.lockId].unlockBuyLockDisabled = true;

  let sender = lock.buyerAddressBuyChain;
  let secret = lock.secret;
  let timeout = lock.buyLockTimeoutRaw;

  if (buyChainId.value == 0) {
    console.log({sender, secret, timeout});
    const injector = await web3FromAddress(sellerAddressBuyChain.value);
    try {
      const unsub = await $acuityClient.api.tx.atomicSwap
        .unlock(sender, secret, timeout)
        .signAndSend(sellerAddressBuyChain.value, { signer: injector.signer }, (result: any) => {
          console.log(result);
          if (!result.status.isInBlock) {
            locks[lock.lockId].unlockBuyLockWaiting = true;
          }
          else {
            unsub();
            load();
            locks[lock.lockId].unlockBuyLockWaiting = false;
            locks[lock.lockId].unlockBuyLockDisabled = false;
          }
        });
    }
    catch (e) {
      locks[lock.lockId].unlockBuyLockWaiting = false;
      locks[lock.lockId].unlockBuyLockDisabled = false;
    }

    return;
  }

  // Ensure MetaMask is on the correct chain.
  if (store.metaMaskChainId != buyChainId.value) {
    try {
      await $ethClient.switchEthereumChain(buyChainId.value);
    }
    catch (e) {
      locks[lock.lockId].unlockBuyLockDisabled = false;
      return;
    }
  }

  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(18, 22));

  if (type == 0) {
    console.log({sender, secret, timeout});

    $ethClient.atomicSwap.methods
      .unlock(sender, secret, timeout)
      .send({from: store.metaMaskAccount})
      .on('transactionHash', function(payload: any) {
        locks[lock.lockId].unlockBuyLockWaiting = true;
      })
      .on('receipt', function(receipt: any) {
        locks[lock.lockId].unlockBuyLockWaiting = false;
        locks[lock.lockId].unlockBuyLockDisabled = false;
      })
      .on('error', function(error: any) {
        locks[lock.lockId].unlockBuyLockWaiting = false;
        locks[lock.lockId].unlockBuyLockDisabled = false;
      });
  }
  else {
    let token = '0x' + route.params.buyAssetId.slice(26, 66);
    console.log({token, sender, secret, timeout});

    $ethClient.atomicSwapERC20.methods
      .unlock(token, sender, secret, timeout)
      .send({from: store.metaMaskAccount})
      .on('transactionHash', function(payload: any) {
        locks[lock.lockId].unlockBuyLockWaiting = true;
      })
      .on('receipt', function(receipt: any) {
        locks[lock.lockId].unlockBuyLockWaiting = false;
        locks[lock.lockId].unlockBuyLockDisabled = false;
      })
      .on('error', function(error: any) {
        locks[lock.lockId].unlockBuyLockWaiting = false;
        locks[lock.lockId].unlockBuyLockDisabled = false;
      });
  }
}

/**
 * Called by buyer.
 */
async function timeoutBuyLock(lock: any) {
  locks[lock.lockId].timeoutBuyLockDisabled = true;

  let recipient = sellerAddressBuyChain.value;
  let hashedSecret = lock.hashedSecret;
  let timeout = lock.buyLockTimeoutRaw;

  if (buyChainId.value == 0) {
    console.log({recipient, hashedSecret, timeout});
    const injector = await web3FromAddress(lock.buyerAddressBuyChain);
    try {
      const unsub = await $acuityClient.api.tx.atomicSwap
        .retrieve(recipient, hashedSecret, timeout)
        .signAndSend(lock.buyerAddressBuyChain, { signer: injector.signer }, (result: any) => {
          console.log(result);
          if (!result.status.isInBlock) {
            locks[lock.lockId].timeoutBuyLockWaiting = false;
          }
          else {
            unsub();
            load();
            locks[lock.lockId].timeoutBuyLockWaiting = false;
            locks[lock.lockId].timeoutBuyLockDisabled = false;
          }
        });
    }
    catch (e) {
      locks[lock.lockId].timeoutBuyLockWaiting = false;
      locks[lock.lockId].timeoutBuyLockDisabled = false;
    }

    return;
  }

  // Ensure MetaMask is on the correct chain.
  if (store.metaMaskChainId != buyChainId.value) {
    try {
      await $ethClient.switchEthereumChain(buyChainId.value);
    }
    catch (e) {
      locks[lock.lockId].timeoutBuyLockDisabled = false;
      return;
    }
  }

  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(18, 22));

  if (type == 0) {
    console.log({recipient, hashedSecret, timeout});

    $ethClient.atomicSwap.methods
      .retrieve(recipient, hashedSecret, timeout)
      .send({from: store.metaMaskAccount})
      .on('transactionHash', function(payload: any) {
        locks[lock.lockId].timeoutBuyLockWaiting = true;
      })
      .on('receipt', function(receipt: any) {
        locks[lock.lockId].timeoutBuyLockWaiting = false;
        locks[lock.lockId].timeoutBuyLockDisabled = false;
      })
      .on('error', function(error: any) {
        locks[lock.lockId].timeoutBuyLockWaiting = false;
        locks[lock.lockId].timeoutBuyLockDisabled = false;
      });
  }
  else {
    let token = '0x' + route.params.buyAssetId.slice(26, 66);
    console.log({token, recipient, hashedSecret, timeout});

    $ethClient.atomicSwapERC20.methods
      .retrieve(recipient, hashedSecret, timeout)
      .send({from: store.metaMaskAccount})
      .on('transactionHash', function(payload: any) {
        locks[lock.lockId].timeoutBuyLockWaiting = true;
      })
      .on('receipt', function(receipt: any) {
        locks[lock.lockId].timeoutBuyLockWaiting = false;
        locks[lock.lockId].timeoutBuyLockDisabled = false;
      })
      .on('error', function(error: any) {
        locks[lock.lockId].timeoutBuyLockWaiting = false;
        locks[lock.lockId].timeoutBuyLockDisabled = false;
      });
  }
}

/**
 * Called by seller.
 */
async function timeoutSellLock(lock: any) {
  locks[lock.lockId].timeoutSellLockDisabled = true;

  let recipient = lock.buyerAddressSellChain;
  let hashedSecret = lock.hashedSecret;
  let timeout = lock.sellLockTimeoutRaw;

  if (sellChainId.value == 0) {
    console.log({recipient, hashedSecret, timeout});
    const injector = await web3FromAddress(sellerAddressSellChain.value);
    try {
      const unsub = await $acuityClient.api.tx.atomicSwap
        .retrieve(recipient, hashedSecret, timeout)
        .signAndSend(sellerAddressSellChain.value, { signer: injector.signer }, (result: any) => {
          console.log(result);
          if (!result.status.isInBlock) {
            locks[lock.lockId].timeoutSellLockWaiting = false;
          }
          else {
            unsub();
            load();
            locks[lock.lockId].timeoutSellLockWaiting = false;
            locks[lock.lockId].timeoutSellLockDisabled = false;
          }
        });
    }
    catch (e) {
      locks[lock.lockId].timeoutSellLockWaiting = false;
      locks[lock.lockId].timeoutSellLockDisabled = false;
    }

    return;
  }

  // Ensure MetaMask is on the correct chain.
  if (store.metaMaskChainId != sellChainId.value) {
    try {
      await $ethClient.switchEthereumChain(sellChainId.value);
    }
    catch (e) {
      locks[lock.lockId].timeoutSellLockDisabled = false;
      return;
    }
  }

  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(18, 22));

  if (type == 0) {
    console.log({recipient, hashedSecret, timeout});

    $ethClient.atomicSwap.methods
      .retrieve(recipient, hashedSecret, timeout)
      .send({from: store.metaMaskAccount})
      .on('transactionHash', function(payload: any) {
        locks[lock.lockId].timeoutSellLockWaiting = true;
      })
      .on('receipt', function(receipt: any) {
        locks[lock.lockId].timeoutSellLockWaiting = false;
        locks[lock.lockId].timeoutSellLockDisabled = false;
      })
      .on('error', function(error: any) {
        locks[lock.lockId].timeoutSellLockWaiting = false;
        locks[lock.lockId].timeoutSellLockDisabled = false;
      });
  }
  else {
    let token = '0x' + route.params.buyAssetId.slice(26, 66);
    console.log({token, recipient, hashedSecret, timeout});

    $ethClient.atomicSwapERC20.methods
      .retrieve(recipient, hashedSecret, timeout)
      .send({from: store.metaMaskAccount})
      .on('transactionHash', function(payload: any) {
        locks[lock.lockId].timeoutSellLockWaiting = true;
      })
      .on('receipt', function(receipt: any) {
        locks[lock.lockId].timeoutSellLockWaiting = false;
        locks[lock.lockId].timeoutSellLockDisabled = false;
      })
      .on('error', function(error: any) {
        locks[lock.lockId].timeoutSellLockWaiting = false;
        locks[lock.lockId].timeoutSellLockDisabled = false;
      });
  }
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" lg="10">
        <v-row>
          <v-col cols="12" sm="6" md="6">
            <v-text-field readonly v-model="sellerName" label="Seller" hint="Who is selling." persistent-hint></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="6">
            <v-text-field readonly v-model="sellerTelegram" label="Seller's Telegram" persistent-hint></v-text-field>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" sm="6" md="6">
            <v-text-field readonly v-model="sellChain" label="Sell chain" persistent-hint></v-text-field>
            <v-text-field readonly v-model="sellAsset" label="Sell asset" hint="Asset being sold." persistent-hint></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="6">
            <v-text-field readonly v-model="buyChain" label="Buy chain" persistent-hint></v-text-field>
            <v-text-field readonly v-model="buyAsset" label="Buy asset" hint="Asset to pay with." persistent-hint></v-text-field>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-text-field readonly v-model="value" label="Sell quantity" :suffix="sellSymbol" hint="How much is for sale." persistent-hint></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field readonly v-model="price" label="Price" :suffix="buySymbol + ' / ' + sellSymbol" hint="Price asset is being sold for." persistent-hint></v-text-field>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field readonly v-model="total" label="Buy quantity" :suffix="buySymbol" hint="Maximum that can be paid." persistent-hint></v-text-field>
          </v-col>
        </v-row>

        <template v-if="sellerAddressBuyChain !== undefined">
          <template v-if="sellerAddressBuyChain === null">
            <v-alert type="error" variant="outlined" class="mt-8 mb-8">
              Seller has not published their buy chain address.
            </v-alert>
          </template>
          <template v-else>
            <template v-if="store.activeAcu == sellerAccountId">
              <v-alert type="info" variant="outlined" icon="mdi-atom-variant" class="mt-8 mb-8">
                <ol>
                  <li>1) When a buyer creates a buy lock it will appear below.</li>
                  <li>2) Click on the lock icon to create a sell lock.</li>
                  <li>3) Wait for the buyer to unlock the sell lock.</li>
                  <li>4) Unlock the buy lock.</li>
                  <li>5) If the seller doesn't unlock the sell lock, wait for the timeout.</li>
                </ol>
              </v-alert>
            </template>
            <template v-else>
              <v-alert type="info" variant="outlined" icon="mdi-atom-variant" class="mt-8 mb-8">
                <ol>
                  <li>1) Contact the seller to confirm the trade.</li>
                  <li>2) Create a buy lock.</li>
                  <li>3) Once the seller has created the sell lock, unlock it to receive your funds.</li>
                  <li>4) If the seller doesn't create the sell lock, wait for the timeout.</li>
                </ol>
              </v-alert>
              <v-card class="mb-10 mt-8" :disabled="buyDisabled">
                <v-toolbar color="blue">
                  <v-toolbar-title>Buy</v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" sm="6" md="6">
                      <v-text-field v-model="buyValue" label="Buy value" :suffix="sellSymbol" hint="How much you want to buy." persistent-hint></v-text-field>
                    </v-col>
                    <v-col cols="12" sm="6" md="6">
                      <v-text-field readonly v-model="buyCost" label="Cost" :suffix="buySymbol" hint="Cost to buy." persistent-hint></v-text-field>
                    </v-col>
                  </v-row>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="success" @click="createBuyLock">Create buy lock</v-btn>
                </v-card-actions>
                <v-progress-linear :indeterminate="buyWaiting" color="yellow darken-2"></v-progress-linear>
              </v-card>
            </template>
            <v-table class="mb-10">
              <thead>
                <tr>
                  <th class="text-left">
                    Buyer
                  </th>
                  <th class="text-right">
                    Buy Lock<br />({{ buySymbol }})
                  </th>
                  <th class="text-right">
                    Price<br />({{ buySymbol + ' / ' + sellSymbol }})
                  </th>
                  <th class="text-left">
                    State
                  </th>
                  <th class="text-left">
                    Timeout
                  </th>
                  <th class="text-left"></th>
                  <th style="background-color: rgba(18, 18, 18);"></th>
                  <th class="text-right">
                    Sell Lock<br />({{ sellSymbol }})
                  </th>
                  <th class="text-left">
                    State
                  </th>
                  <th class="text-left">
                    Timeout
                  </th>
                  <th class="text-left"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(lock, lockId) in locks" :key="lockId">
                  <td>{{ lock.buyerName }}</td>
                  <td class="text-right">{{ lock.buyLockValue }}</td>
                  <td class="text-right">{{ lock.buyLockPrice }}</td>
                  <td>{{ lock.buyLockState }}</td>
                  <td>{{ lock.buyLockTimeout }}</td>
                  <td>
                    <v-btn v-if="lock.buyLockState == 'Locked' && lock.sellLockState == 'Unlocked' && (buyChainId == 0 || store.metaMaskAccount == sellerAddressBuyChain)" size="small" @click="unlockBuyLock(lock)" :disabled="lock.unlockBuyLockDisabled">
                      <v-icon v-if="!lock.unlockBuyLockWaiting">mdi-lock-open-variant</v-icon>
                      <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                    </v-btn>
                    <v-btn v-if="lock.buyLockState == 'Locked' && lock.buyLockTimeoutMS < time && (buyChainId == 0 || store.metaMaskAccount == lock.buyerAddressBuyChain)" size="small" @click="timeoutBuyLock(lock)" :disabled="lock.timeoutBuyLockDisabled">
                      <v-icon v-if="!lock.timeoutBuyLockWaiting">mdi-timer-lock-open-outline</v-icon>
                      <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                    </v-btn>
                  </td>
                  <td style="background-color: rgb(18, 18, 18);"></td>
                  <td class="text-right">{{ lock.sellLockValue }}</td>
                  <td>{{ lock.sellLockState }}</td>
                  <td>{{ lock.sellLockTimeout }}</td>
                  <td>
                    <v-btn v-if="lock.sellLockState == 'Not locked' && (sellChainId == 0 || store.metaMaskAccount == sellerAddressSellChain)" size="small" @click="createSellLock(lock)" :disabled="lock.createSellLockDisabled">
                      <v-icon v-if="!lock.createSellLockWaiting">mdi-lock</v-icon>
                      <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                    </v-btn>
                    <v-btn v-if="lock.sellLockState == 'Locked' && (sellChainId == 0 || store.metaMaskAccount == lock.buyerAddressSellChain)" size="small" @click="unlockSellLock(lock)" :disabled="lock.unlockSellLockDisabled">
                      <v-icon v-if="!lock.unlockSellLockWaiting">mdi-lock-open-variant</v-icon>
                      <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                    </v-btn>
                    <v-btn v-if="lock.sellLockState == 'Locked' && lock.sellLockTimeoutMS < time && (buyChainId == 0 || store.metaMaskAccount == sellerAddressSellChain)" size="small" @click="timeoutSellLock(lock)" :disabled="lock.timeoutSellLockDisabled">
                      <v-icon v-if="!lock.timeoutSellLockWaiting">mdi-timer-lock-open-outline</v-icon>
                      <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </template>
        </template>
      </v-col>
    </v-row>
  </v-container>
  <v-dialog v-model="dialogAllowanceBuy" width="50%" persistent>
    <v-card :disabled="allowanceDisabledBuy">
      <v-toolbar color="blue">
        <v-toolbar-title>Approve Buy Allowance</v-toolbar-title>
      </v-toolbar>
      <v-card-text>
        <v-text-field readonly v-model="buyCost" label="Lock value" :suffix="buySymbol"></v-text-field>
        <v-text-field readonly v-model="allowanceCurrentBuy" label="Current allowance" :suffix="buySymbol"></v-text-field>
        <v-text-field v-model="allowanceNewBuy" label="New allowance" :suffix="buySymbol"></v-text-field>
<!--        <v-checkbox v-model="unlimited" label="Unlimited"></v-checkbox>-->
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="success" @click="approveAllowanceBuy">Approve</v-btn>
        <v-btn color="error" @click="dialogAllowanceBuy = false">Cancel</v-btn>
      </v-card-actions>
      <v-progress-linear :indeterminate="allowanceWaitingBuy" color="yellow darken-2"></v-progress-linear>
    </v-card>
  </v-dialog>
  <v-dialog v-model="dialogAllowanceSell" width="50%" persistent>
    <v-card :disabled="allowanceDisabledSell">
      <v-toolbar color="blue">
        <v-toolbar-title>Approve Sell Allowance</v-toolbar-title>
      </v-toolbar>
      <v-card-text>
        <v-text-field readonly v-model="allowanceLockSell" label="Lock value" :suffix="sellSymbol"></v-text-field>
        <v-text-field readonly v-model="allowanceCurrentSell" label="Current allowance" :suffix="sellSymbol"></v-text-field>
        <v-text-field v-model="allowanceNewSell" label="New allowance" :suffix="sellSymbol"></v-text-field>
<!--        <v-checkbox v-model="unlimited" label="Unlimited"></v-checkbox>-->
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="success" @click="approveAllowanceSell">Approve</v-btn>
        <v-btn color="error" @click="dialogAllowanceSell = false">Cancel</v-btn>
      </v-card-actions>
      <v-progress-linear :indeterminate="allowanceWaitingSell" color="yellow darken-2"></v-progress-linear>
    </v-card>
  </v-dialog>
</template>
