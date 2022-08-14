import { createRouter, createWebHistory } from 'vue-router'

import ActiveAccount from '../components/ActiveAccount.vue'
import Goto from '../components/Goto.vue'
import Account from '../components/Account.vue'
import Chains from '../components/Chains.vue'
import Tokens from '../components/Tokens.vue'
import Buy from '../components/Buy.vue'
import Sell from '../components/Sell.vue'
import SellOrder from '../components/SellOrder.vue'

const routes = [
  {
    path: '/',
    name: 'active-account',
    component: ActiveAccount,
  },
  {
    path: '/goto',
    name: 'goto',
    component: Goto,
  },
  {
    path: '/account/:id',
    name: 'account',
    component: Account,
  },
  {
    path: '/chains',
    name: 'chains',
    component: Chains,
  },
  {
    path: '/tokens/:chainId',
    name: 'tokens',
    component: Tokens,
  },
  {
    path: '/buy',
    name: 'buy',
    component: Buy,
  },
  {
    path: '/sell',
    name: 'sell',
    component: Sell,
  },
  {
    path: '/sell-order/:accountId/:sellAssetId/:buyAssetId',
    name: 'sell-order',
    component: SellOrder,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes, // short for `routes: routes`
})

export default router;
