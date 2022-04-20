import { ApiPromise, WsProvider } from '@polkadot/api'

export default class MixClient {
	api: any

	async init(vue: any) {

    let acuityEndpoint = (process.env.NODE_ENV == 'development') ? 'ws://127.0.0.1:9944' : 'wss://acuity.social:9961';
    let wsProvider = new WsProvider(acuityEndpoint);
    await ApiPromise.create({
      provider: wsProvider,
      types: {
        AcuityOrderId: '[u8; 16]',
        AcuityAssetId: '[u8; 16]',
        AcuityForeignAddress: '[u8; 32]',
        AcuityHashedSecret: '[u8; 32]',
        AcuitySecret: '[u8; 32]',
        Timestamp: 'u64',
        EthereumAddress: '[u8; 20]',
      }
    }).then(async api => {
      this.api = api;
      await this.api.isReady
    });
  }
}
