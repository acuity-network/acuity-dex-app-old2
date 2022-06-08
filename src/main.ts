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

const app = createApp(App).use(router).use(createPinia()).use(vuetify)
app.provide('$acuityClient', await (new AcuityClient()).init())
app.provide('$ethClient', await (new EthClient()).init())
app.provide('$db', db.init())
app.mount('#app')
