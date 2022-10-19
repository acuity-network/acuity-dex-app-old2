<script setup lang="ts">
import { ref, reactive, inject, onMounted, computed, watch} from 'vue'

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

import erc20AbiJson from '../lib/contracts/ERC20.abi.json'
const erc20Abi: any = erc20AbiJson;

const store = main();

const time = ref(0);
const locks: any = reactive({});

const sellerAccountId = ref("");
const sellerName = ref("");
const sellChainId = ref(0);
const sellToken = ref("");
const sellBalance = ref("");
const buyChainId = ref(0);
const buyToken = ref("");
const buyBalance = ref("");
const price = ref("");
const value = ref("");
const total = ref("");
const buyValue = ref("");

let sellPriceWei = BigInt(0);
let sellValueWei = BigInt(0);


const buyDisabled = ref(false);
const buyWaiting = ref(false);

const buyCost = computed(() => {

  let buyValueWei = BigInt($ethClient.web3.utils.toWei((buyValue.value != '') ? buyValue.value : '0'));
  let buyCostWei = (buyValueWei * sellPriceWei) / (BigInt(10) ** BigInt(18));

  return $ethClient.web3.utils.fromWei(buyCostWei.toString());
});

let sellerAddressBuyChain = ref("");
let sellerAddressSellChain = ref("");
let priceWei: typeof $ethClient.web3.utils.BN;

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

function getLockId(returnValues: any) {
  let sender = $ethClient.web3.utils.padLeft(returnValues.sender, 64).slice(2);
  let recipient = $ethClient.web3.utils.padLeft(returnValues.recipient, 64).slice(2);
  let hashedSecret = returnValues.hashedSecret.slice(2);
  let timeout = $ethClient.web3.utils.padLeft($ethClient.web3.utils.numberToHex(returnValues.timeout), 64).slice(2);
  return $ethClient.web3.utils.keccak256('0x' + sender + recipient + hashedSecret + timeout);
}

function getTokenLockId(returnValues: any) {
  let token = $ethClient.web3.utils.padLeft(returnValues.token, 64).slice(2);
  let sender = $ethClient.web3.utils.padLeft(returnValues.sender, 64).slice(2);
  let recipient = $ethClient.web3.utils.padLeft(returnValues.recipient, 64).slice(2);
  let hashedSecret = returnValues.hashedSecret.slice(2);
  let timeout = $ethClient.web3.utils.padLeft($ethClient.web3.utils.numberToHex(returnValues.timeout), 64).slice(2);
  return $ethClient.web3.utils.keccak256('0x' + token + sender + recipient + hashedSecret + timeout);
}

async function load() {
  time.value = Math.round(Date.now() / 1000);

  let newLocks: any = {};

  sellBalance.value = '';
  buyBalance.value = '';

  let sellChainIdHex = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(sellChainId.value), 16);
  let result = (await $acuityClient.api.query.orderbook.accountForeignAccount(store.activeAcu, sellChainIdHex)).unwrap();
  let buyerAddressSellChain = '0x' + Buffer.from(result).toString('hex').slice(24);
  let sellToken = '0x' + route.params.sellAssetId.slice(26, 66);

  if (sellToken == "0x0000000000000000000000000000000000000000") {
    try {
      sellBalance.value = $ethClient.formatWei(await $ethClient.chains[sellChainId.value].web3.eth.getBalance(buyerAddressSellChain));
    }
    catch (e) {};
  }
  else {
    try {
      let token = new $ethClient.chains[sellChainId.value].web3.eth.Contract(erc20Abi, sellToken);
      sellBalance.value = $ethClient.formatWei(await token.methods
        .balanceOf(buyerAddressSellChain)
        .call());
      }
      catch (e) {};
  }

  let buyChainIdHex = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(buyChainId.value), 16);
  result = (await $acuityClient.api.query.orderbook.accountForeignAccount(store.activeAcu, buyChainIdHex)).unwrap();
  let buyerAddressBuyChain = '0x' + Buffer.from(result).toString('hex').slice(24);
  let buyToken = '0x' + route.params.buyAssetId.slice(26, 66);

  if (buyToken == "0x0000000000000000000000000000000000000000") {
    try {
      buyBalance.value = $ethClient.formatWei(await $ethClient.chains[buyChainId.value].web3.eth.getBalance(buyerAddressBuyChain));
    }
    catch (e) {};
  }
  else {
    try {
      let token = new $ethClient.chains[buyChainId.value].web3.eth.Contract(erc20Abi, buyToken);
      buyBalance.value = $ethClient.formatWei(await token.methods
        .balanceOf(buyerAddressBuyChain)
        .call());
      }
      catch (e) {};
  }

  let buyHeight;
  let sellHeight;

  if (buyChainId.value) {
    buyHeight = await $ethClient.chains[buyChainId.value].web3.eth.getBlockNumber();
  }
  if (sellChainId.value) {
    sellHeight = await $ethClient.chains[sellChainId.value].web3.eth.getBlockNumber();
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
          if (event.event.section == 'atomicSwap' && event.event.method == 'BuyLock') {
            console.log(event.event.data);

            let lockId = $ethClient.web3.utils.bytesToHex(event.event.data[5]);

            let sellLockValue = (parseFloat(event.event.data[4]) / price.value).toString();

            newLocks[lockId] = {
              lockId: lockId,
              secret: "",
              hashedSecret: $ethClient.web3.utils.bytesToHex(event.event.data[2]),
              buyerAddressSellChain: $ethClient.web3.utils.bytesToHex(event.event.data[0]),
              buyerName: await loadName(encodeAddress(event.event.data[0])),
              buyLockValue: $ethClient.formatWei(event.event.data[4]),
              buyLockState: "Locked",
              buyLockTimeoutRaw: event.event.data[3],
              buyLockTimeout: new Date(parseInt(event.event.data[3])).toLocaleString(),
              sellLockValueWei: sellLockValue,
              sellLockValue: $ethClient.formatWei(sellLockValue),
              sellLockState: "Not locked",
              createSellLockDisabled: false,
              createSellLockWaiting: false,
              unlockSellLockDisabled: false,
              unlockSellLockWaiting: false,
              unlockBuyLockDisabled: false,
              unlockBuyLockWaiting: false,
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
      events = await $ethClient.chains[buyChainId.value].atomicSwap.getPastEvents('BuyLock', {
        fromBlock: Math.max(buyHeight - 2000, 0),
      });
    }
    else {
      events = await $ethClient.chains[buyChainId.value].atomicSwapERC20.getPastEvents('BuyLock', {
        fromBlock: Math.max(buyHeight - 2000, 0),
      });
    }

    for (let event of events) {
      if ((event.returnValues.recipient.toLowerCase() != sellerAddressBuyChain.value.toLowerCase()) ||      // buy lock for seller
        (event.returnValues.sellAssetId != (route.params.sellAssetId as string).toLowerCase()) ||   // correct sell assetId
        (event.returnValues.sellPrice != sellPriceWei.toString()))                                                   // correct price
      {
        continue;
      }
      let lockId;
      if (buyType == 0) {
        lockId = getLockId(event.returnValues);
      }
      else {
        lockId = getTokenLockId(event.returnValues);
      }

      let buyerAcuAddress = encodeAddress(await $ethClient.chains[buyChainId.value].account.methods.getAcuAccount(event.returnValues.sender).call());

      let buyChainIdHex = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(buyChainId.value), 16);
      let result = (await $acuityClient.api.query.orderbook.accountForeignAccount(buyerAcuAddress, buyChainIdHex)).unwrap();
      let sellAddress = '0x' + Buffer.from(result).toString('hex').slice(24);

      // Calculate how much value the sell lock should have.
      let buyLockValueWei = BigInt(event.returnValues.value);
      let sellLockValueWei = (buyLockValueWei * (BigInt(10) ** BigInt(18))) / sellPriceWei;

      newLocks[lockId] = {
        lockId: lockId,
        secret: "",
        hashedSecret: event.returnValues.hashedSecret,
        buyerAddressBuyChain: event.returnValues.sender.toLowerCase(),
        buyerAddressSellChain: sellAddress,
        buyerName: await loadName(buyerAcuAddress),
        buyLockValue: $ethClient.formatWei(event.returnValues.value),
        buyLockState: "Locked",
        buyLockTimeoutRaw: event.returnValues.timeout,
        buyLockTimeout: new Date(parseInt(event.returnValues.timeout) * 1000).toLocaleString(),
        sellLockValueWei: sellLockValueWei,
        sellLockValue: $ethClient.formatWei(sellLockValueWei.toString()),
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

  if (buyChainId.value == 0) {
  }
  else {
    if (sellType == 0) {
      events = await $ethClient.chains[sellChainId.value].atomicSwap.getPastEvents('SellLock', {
        fromBlock: Math.max(sellHeight - 2000, 0),
      });
    }
    else {
      events = await $ethClient.chains[sellChainId.value].atomicSwapERC20.getPastEvents('SellLock', {
        fromBlock: Math.max(sellHeight - 2000, 0),
      });
    }

    for (let event of events) {
      let buyLockId = event.returnValues.buyLockId;
      if (newLocks[buyLockId]) {
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
        newLocks[buyLockId].sellLockTimeoutRaw = event.returnValues.timeout;
        newLocks[buyLockId].sellLockTimeout = new Date(parseInt(event.returnValues.timeout) * 1000).toLocaleString();
      }
    }

    if (sellType == 0) {
      events = await $ethClient.chains[sellChainId.value].atomicSwap.getPastEvents('UnlockByRecipient', {
        fromBlock: Math.max(sellHeight - 2000, 0),
      });
    }
    else {
      events = await $ethClient.chains[sellChainId.value].atomicSwapERC20.getPastEvents('UnlockByRecipient', {
        fromBlock: Math.max(sellHeight - 2000, 0),
      });
    }

    for (let event of events) {
      // Is it the sell lock?
      if (event.returnValues.sender.toLowerCase() == sellerAddressSellChain.value) {
        // Find the buy lock.
        for (let lockId in newLocks) {
          if (newLocks[lockId].sellLockId == event.returnValues.lockId) {
            newLocks[lockId].secret = event.returnValues.secret;
            newLocks[lockId].sellLockState = "Unlocked";
          }
        }
      }
    }

    if (sellType == 0) {
      events = await $ethClient.chains[sellChainId.value].atomicSwap.getPastEvents('Timeout', {
        fromBlock: Math.max(sellHeight - 2000, 0),
      });
    }
    else {
      events = await $ethClient.chains[sellChainId.value].atomicSwapERC20.getPastEvents('Timeout', {
        fromBlock: Math.max(sellHeight - 2000, 0),
      });
    }

    for (let event of events) {
      // Is it the sell lock?
      if (event.returnValues.sender.toLowerCase() == sellerAddressSellChain.value) {
        // Find the buy lock.
        for (let lockId in newLocks) {
          if (newLocks[lockId].sellLockId == event.returnValues.lockId) {
            newLocks[lockId].secret = event.returnValues.secret;
            newLocks[lockId].sellLockState = "Timed out";
          }
        }
      }
    }

    if (buyType == 0) {
      events = await $ethClient.chains[buyChainId.value].atomicSwap.getPastEvents('UnlockByRecipient', {
        fromBlock: Math.max(buyHeight - 2000, 0),
      });
    }
    else {
      events = await $ethClient.chains[buyChainId.value].atomicSwapERC20.getPastEvents('UnlockByRecipient', {
        fromBlock: Math.max(buyHeight - 2000, 0),
      });
    }

    for (let event of events) {
      // Is it the buy lock?
      if (event.returnValues.recipient.toLowerCase() == sellerAddressBuyChain.value) {
        if (newLocks[event.returnValues.lockId]) {
          newLocks[event.returnValues.lockId].buyLockState = "Unlocked";
        }
      }
    }

    if (buyType == 0) {
      events = await $ethClient.chains[buyChainId.value].atomicSwap.getPastEvents('Timeout', {
        fromBlock: Math.max(buyHeight - 2000, 0),
      });
    }
    else {
      events = await $ethClient.chains[buyChainId.value].atomicSwapERC20.getPastEvents('Timeout', {
        fromBlock: Math.max(buyHeight - 2000, 0),
      });
    }

    for (let event of events) {
      // Is it the buy lock?
      if (event.returnValues.recipient.toLowerCase() == sellerAddressBuyChain.value) {
        if (newLocks[event.returnValues.lockId]) {
          newLocks[event.returnValues.lockId].buyLockState = "Timed out";
        }
      }
    }
  }

  for (let lockId in newLocks) {
    locks[lockId] = newLocks[lockId];
  }
}

let buyEmitter;
let sellEmitter;
let buyEmitterERC20;
let sellEmitterERC20;

onMounted(async () => {
  sellerAccountId.value = route.params.accountId as string;
  sellerName.value = await loadName(sellerAccountId.value);
  sellChainId.value = $ethClient.web3.utils.hexToNumber('0x' + route.params.sellAssetId.slice(6, 18));
  sellToken.value = '0x' + route.params.sellAssetId.slice(26, 66);
  buyChainId.value = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(6, 18));
  buyToken.value = '0x' + route.params.buyAssetId.slice(26, 66);

  let chainIdHex = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(sellChainId.value), 16);
  let result = (await $acuityClient.api.query.orderbook.accountForeignAccount(sellerAccountId.value, chainIdHex)).unwrap();
  sellerAddressSellChain.value = '0x' + Buffer.from(result).toString('hex').slice(24);

  chainIdHex = $ethClient.web3.utils.padLeft($ethClient.web3.utils.toHex(buyChainId.value), 16);
  result = (await $acuityClient.api.query.orderbook.accountForeignAccount(sellerAccountId.value, chainIdHex)).unwrap();
  sellerAddressBuyChain.value = '0x' + Buffer.from(result).toString('hex').slice(24);

  result = (await $acuityClient.api.query.orderbook.accountPairOrder(route.params.accountId, route.params.sellAssetId, route.params.buyAssetId)).unwrap();

  sellPriceWei = BigInt(result.price);
  sellValueWei = BigInt(result.value);
  let buyValueWei = (sellValueWei * sellPriceWei) / (BigInt(10) ** BigInt(18));

  price.value = $ethClient.web3.utils.fromWei(sellPriceWei.toString());
  value.value = $ethClient.web3.utils.fromWei(sellValueWei.toString());
  total.value = $ethClient.web3.utils.fromWei(buyValueWei.toString());

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
    buyEmitter = $ethClient.chains[buyChainId.value].atomicSwap.events.allEvents()
    .on('data', function(event: any){
      load();
    });

    buyEmitterERC20 = $ethClient.chains[buyChainId.value].atomicSwapERC20.events.allEvents()
    .on('data', function(event: any){
      load();
    });
  }

  if (sellChainId.value) {
    sellEmitter = $ethClient.chains[sellChainId.value].atomicSwap.events.allEvents()
    .on('data', function(event: any){
      load();
    });

    sellEmitterERC20 = $ethClient.chains[sellChainId.value].atomicSwapERC20.events.allEvents()
    .on('data', function(event: any){
      load();
    });
  }

  load();
});

/*
watch(() => store.metaMaskAccount, async (newValue, oldValue) => {
  load();
});
*/

/**
 * Called by buyer.
 */
async function createBuyLock(event: any) {
  buyDisabled.value = true;

  let secret = $ethClient.web3.utils.randomHex(32);
  let hashedSecret = $ethClient.web3.utils.keccak256(secret);
  $db.put('/secrets/' + hashedSecret, secret);
  let timeout = Math.round(Date.now() / 1000) + 60 * 60 * 3;   // 3 hours

  let buyValueWei = BigInt($ethClient.web3.utils.toWei(buyValue.value));
  let value = ((buyValueWei * sellPriceWei) / (BigInt(10) ** BigInt(18))).toString();

  let sellAssetId = route.params.sellAssetId
  let sellPrice = sellPriceWei.toString();

  if (buyChainId.value == 0) {
    let recipient = sellerAccountId.value;
    console.log({recipient, hashedSecret, timeout, value, sellAssetId, sellPriceWei});
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

  let recipient = sellerAddressBuyChain.value;
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
    let token = '0x' + route.params.buyAssetId.slice(26, 66);
    console.log({token, recipient, hashedSecret, timeout, value, sellAssetId, sellPrice});

    $ethClient.atomicSwapERC20.methods
      .lockBuy(token, recipient, hashedSecret, timeout, value, sellAssetId, sellPrice)
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

/**
 * Called by seller.
 */
async function createSellLock(lock: any) {
  locks[lock.lockId].createSellLockDisabled = true;

  console.log(lock);

  let recipient = lock.buyerAddressSellChain;
  let hashedSecret = lock.hashedSecret;
  let timeout = Math.round(Date.now() / 1000) + 60 * 60 * 2;   // 2 hours
  let buyAssetId = route.params.buyAssetId;
//  let value = $ethClient.web3.utils.numberToHex(lock.sellLockValueWei);
  let value = lock.sellLockValueWei.toString();
  let buyLockId = lock.lockId;

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
      let token = '0x' + route.params.sellAssetId.slice(26, 66);
      console.log({token, recipient, hashedSecret, timeout, value, buyAssetId, buyLockId});

      $ethClient.atomicSwapERC20.methods
        .lockSell(token, recipient, hashedSecret, timeout, value, buyAssetId, buyLockId)
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

/**
 * Called by buyer, revealing secret.
 */
async function unlockSellLock(lock: any) {
  locks[lock.lockId].unlockSellLockDisabled = true;

  let sender = sellerAddressSellChain.value;
  let secret = await $db.get('/secrets/' + lock.hashedSecret);
  let timeout = lock.sellLockTimeoutRaw;

  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.sellAssetId.slice(18, 22));

  if (type == 0) {
    console.log({sender, secret, timeout});

    $ethClient.atomicSwap.methods
      .unlockByRecipient(sender, secret, timeout)
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
      .unlockByRecipient(token, sender, secret, timeout)
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

  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(18, 22));

  if (type == 0) {
    console.log({sender, secret, timeout});

    $ethClient.atomicSwap.methods
      .unlockByRecipient(sender, secret, timeout)
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
      .unlockByRecipient(token, sender, secret, timeout)
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

  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(18, 22));

  if (type == 0) {
    console.log({recipient, hashedSecret, timeout});

    $ethClient.atomicSwap.methods
      .timeoutBySender(recipient, hashedSecret, timeout)
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
      .timeoutBySender(recipient, hashedSecret, timeout)
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

  let type = $ethClient.web3.utils.hexToNumber('0x' + route.params.buyAssetId.slice(18, 22));

  if (type == 0) {
    console.log({recipient, hashedSecret, timeout});

    $ethClient.atomicSwap.methods
      .timeoutBySender(recipient, hashedSecret, timeout)
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
      .timeoutBySender(recipient, hashedSecret, timeout)
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
      <v-col cols="12" md="12">
        <v-table class="mb-10">
          <thead>
            <tr>
              <th class="text-left">
                Buyer
              </th>
              <th class="text-left">
                Buy Lock ({{ buySymbol }})
              </th>
              <th class="text-left">
                State
              </th>
              <th class="text-left">
                Timeout
              </th>
              <th class="text-left"></th>
              <th style="background-color: rgba(18, 18, 18);"></th>
              <th class="text-left">
                Sell Lock ({{ sellSymbol }})
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
              <td>{{ lock.buyLockValue }}</td>
              <td>{{ lock.buyLockState }}</td>
              <td>{{ lock.buyLockTimeout }}</td>
              <td>
                <v-btn v-if="lock.buyLockState == 'Locked' && lock.sellLockState == 'Unlocked' && store.metaMaskChainId == buyChainId && store.metaMaskAccount == sellerAddressBuyChain" size="small" @click="unlockBuyLock(lock)" :disabled="lock.unlockBuyLockDisabled">
                  <v-icon v-if="!lock.unlockBuyLockWaiting">mdi-lock-open-variant</v-icon>
                  <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                </v-btn>
                <v-btn v-if="lock.buyLockState == 'Locked' && lock.buyLockTimeoutRaw < time && store.metaMaskChainId == buyChainId && store.metaMaskAccount == lock.buyerAddressBuyChain" size="small" @click="timeoutBuyLock(lock)" :disabled="lock.timeoutBuyLockDisabled">
                  <v-icon v-if="!lock.timeoutBuyLockWaiting">mdi-timer-lock-open-outline</v-icon>
                  <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                </v-btn>
              </td>
              <td style="background-color: rgb(18, 18, 18);"></td>
              <td>{{ lock.sellLockValue }}</td>
              <td>{{ lock.sellLockState }}</td>
              <td>{{ lock.sellLockTimeout }}</td>
              <td>
                <v-btn v-if="lock.sellLockState == 'Not locked' && store.metaMaskChainId == sellChainId && store.metaMaskAccount == sellerAddressSellChain" size="small" @click="createSellLock(lock)" :disabled="lock.createSellLockDisabled">
                  <v-icon v-if="!lock.createSellLockWaiting">mdi-lock</v-icon>
                  <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                </v-btn>
                <v-btn v-if="lock.sellLockState == 'Locked' && store.metaMaskChainId == sellChainId && store.metaMaskAccount == lock.buyerAddressSellChain" size="small" @click="unlockSellLock(lock)" :disabled="lock.unlockSellLockDisabled">
                  <v-icon v-if="!lock.unlockSellLockWaiting">mdi-lock-open-variant</v-icon>
                  <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                </v-btn>
                <v-btn v-if="lock.sellLockState == 'Locked' && lock.sellLockTimeoutRaw < time && store.metaMaskChainId == sellChainId && store.metaMaskAccount == sellerAddressSellChain" size="small" @click="timeoutSellLock(lock)" :disabled="lock.timeoutSellLockDisabled">
                  <v-icon v-if="!lock.timeoutSellLockWaiting">mdi-archive-clock</v-icon>
                  <v-progress-circular v-else indeterminate color="yellow darken-2" size="20"></v-progress-circular>
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="10">
        <v-text-field readonly v-model="sellerName" label="Seller" hint="Who is selling." persistent-hint></v-text-field>
        <v-text-field readonly v-model="sellChain" label="Sell chain" persistent-hint></v-text-field>
        <v-text-field readonly v-model="sellAsset" label="Sell asset" hint="Asset being sold." persistent-hint></v-text-field>
        <v-text-field readonly v-model="sellBalance" label="Your sell asset balance" hint="Your current balance of the asset being sold." persistent-hint :suffix="sellSymbol"></v-text-field>
        <v-text-field readonly v-model="buyChain" label="Buy chain" persistent-hint></v-text-field>
        <v-text-field readonly v-model="buyAsset" label="Buy asset" hint="Asset to pay with." persistent-hint></v-text-field>
        <v-text-field readonly v-model="buyBalance" label="Your buy asset balance" hint="Your current balance of the asset you can buy with." persistent-hint :suffix="buySymbol"></v-text-field>
        <v-text-field readonly v-model="price" label="Price" :suffix="buySymbol + ' / ' + sellSymbol" hint="Price asset is being sold for." persistent-hint></v-text-field>
        <v-text-field readonly v-model="value" label="Value" :suffix="sellSymbol" hint="How much is for sale." persistent-hint></v-text-field>
        <v-text-field readonly v-model="total" label="Total" :suffix="buySymbol" hint="Maximum that can be paid." persistent-hint></v-text-field>
        <v-text-field v-model="buyValue" label="Buy value" :suffix="sellSymbol" hint="How much you want to buy." persistent-hint></v-text-field>
        <v-text-field readonly v-model="buyCost" label="Cost" :suffix="buySymbol" hint="Cost to buy." persistent-hint></v-text-field>
        <v-btn @click="createBuyLock" class="mt-4 mb-4"  :disabled="buyDisabled || (buyChainId != 0 && buyChainId != store.metaMaskChainId)">Buy</v-btn>
        <v-progress-linear class="mb-10" :indeterminate="buyWaiting" color="yellow darken-2"></v-progress-linear>
      </v-col>
    </v-row>
  </v-container>
</template>
