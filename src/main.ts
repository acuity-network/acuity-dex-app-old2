import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'

loadFonts()

import db from './lib/db'
import AcuityClient from './lib/AcuityClient'
import EthClient from './lib/EthClient'

async function start() {
	let $db = db.init();

	const app = createApp(App).use(router).use(createPinia()).use(vuetify);
	app.provide('$acuityClient', await (new AcuityClient()).init());
	app.provide('$ethClient', await (new EthClient()).init($db));
	app.provide('$db', $db);
	app.mount('#app');
}

start();
