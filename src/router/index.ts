import { createRouter, createWebHashHistory } from 'vue-router'

import ActiveAccount from '../components/ActiveAccount.vue'
import Goto from '../components/Goto.vue'
import Account from '../components/Account.vue'
import Chains from '../components/Chains.vue'
import Buy from '../components/Buy.vue'
import Sell from '../components/Sell.vue'

const routes = [
  { path: '/', component: ActiveAccount },
  { path: '/goto', component: Goto },
  { path: '/account/:id', component: Account },
  { path: '/chains', component: Chains },
  { path: '/buy', component: Buy },
  { path: '/sell', component: Sell },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes, // short for `routes: routes`
})

export default router;
