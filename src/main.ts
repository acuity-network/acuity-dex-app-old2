import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'

loadFonts()

import AcuityClient from './lib/AcuityClient'
import EthClient from './lib/EthClient'

const app = createApp(App).use(router).use(vuetify)
app.provide('$acuityClient', new AcuityClient())
app.provide('$ethClient', new EthClient())
app.mount('#app')
