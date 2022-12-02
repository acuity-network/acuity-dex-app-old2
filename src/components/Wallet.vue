<script setup lang="ts">
import { ref, inject, onMounted, computed, watch} from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { web3FromAddress } from '@polkadot/extension-dapp';
import { main } from '../stores/index'
import QRCode from 'qrcode'

let $acuityClient: any = inject('$acuityClient');
let $ethClient: any = inject('$ethClient');
let router = useRouter();

const store = main();

const qrCode = ref("");
const sendDisabled = ref(false);
const sendWaiting = ref(false);
const sendAmount = ref("");
const sendDestination = ref("");
const dialogConfirmSend = ref(false);

async function load() {
  let options: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'H',
    scale: 1,
  }

  qrCode.value = await QRCode.toDataURL(store.activeAcu, options);
}

onMounted(async () => {
  load();
});

watch(() => store.activeAcu, async (newValue, oldValue) => {
  load();
});

const sendAmountWei = computed(() => {
  return $ethClient.unformatWei(sendAmount.value);
});

const sendAmountFormatted = computed(() => {
  return $ethClient.formatWei(sendAmountWei.value);
});

async function send(event: any) {
  sendDisabled.value = true;
  const injector = await web3FromAddress(store.activeAcu);
  try {
    const unsub = await $acuityClient.api.tx.balances
      .transfer(sendDestination.value, $ethClient.unformatWei(sendAmount.value))
      .signAndSend(store.activeAcu, { signer: injector.signer }, ({ status, events }: any) => {
        if (!status.isInBlock) {
          sendWaiting.value = true;
        }
        else {
          unsub();
          events
            // find/filter for failed events
            .filter(({ event }: any) =>
              $acuityClient.api.events.system.ExtrinsicFailed.is(event)
            )
            // we know that data for system.ExtrinsicFailed is
            // (DispatchError, DispatchInfo)
            .forEach(({ event: { data: [error, info] } }: any) => {
              if (error.isModule) {
                // for module errors, we have the section indexed, lookup
                const decoded = $acuityClient.api.registry.findMetaError(error.asModule);
                const { docs, method, section } = decoded;

                store.errorSet(`${section}.${method}: ${docs.join(' ')}`);
              } else {
                // Other, CannotLookup, BadOrigin, no extra info
                store.errorSet(error.toString());
              }
            });
          dialogConfirmSend.value = false;
          sendWaiting.value = false;
          sendDisabled.value = false;
        }
      });
  }
  catch (e) {
    dialogConfirmSend.value = false;
    sendWaiting.value = false;
    sendDisabled.value = false;
  }
}

</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" lg="10">
        <v-row>
          <v-col cols="12" sm="8" md="8">
            <v-text-field v-model="store.activeAcu" label="Address" readonly></v-text-field>
            <v-text-field v-model="store.acuBalance[store.activeAcu]" label="Balance" suffix="ACU" readonly></v-text-field>
            <v-card class="mb-10">
              <v-toolbar color="blue">
                <v-toolbar-title>Send ACU</v-toolbar-title>
              </v-toolbar>
              <v-card-text>
                <v-text-field v-model="sendDestination" label="To" hint="Address you want to send it to."></v-text-field>
                <v-text-field v-model="sendAmount" label="Amount" suffix="ACU" hint="How much you want to send."></v-text-field>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="success" @click="dialogConfirmSend = true">Send</v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4" md="4">
            <img class="qr" :src="qrCode" />
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
  <v-dialog v-model="dialogConfirmSend" width="60%" persistent>
    <v-card>
      <v-toolbar color="blue">
        <v-toolbar-title>Confirm Balance Transfer</v-toolbar-title>
      </v-toolbar>
      <v-card-text>
        <v-text-field v-model="store.activeAcu" label="From" readonly></v-text-field>
        <v-text-field v-model="sendDestination" label="To" readonly></v-text-field>
        <v-text-field v-model="sendAmountFormatted" label="Amount" suffix="ACU" readonly></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn :disabled="sendDisabled" color="success" @click="send">Okay</v-btn>
        <v-btn :disabled="sendDisabled" color="error" @click="dialogConfirmSend = false">Cancel</v-btn>
      </v-card-actions>
      <v-progress-linear :indeterminate="sendWaiting" color="yellow darken-2"></v-progress-linear>
    </v-card>
  </v-dialog>
</template>

<style>

.qr {
  image-rendering: pixelated;
  width: 100%;
}

</style>
