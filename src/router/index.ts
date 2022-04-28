import { createRouter, createWebHashHistory } from 'vue-router'

// 1. Define route components.
import HelloWorld from '../components/HelloWorld.vue'
import Account from '../components/Account.vue'
import Orders from '../components/Orders.vue'

// 2. Define some routes
// Each route should map to a component.
// We'll talk about nested routes later.
const routes = [
  { path: '/', component: HelloWorld },
  { path: '/orders', component: Orders },
  { path: '/account/:id', component: Account },
]

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHashHistory(),
  routes, // short for `routes: routes`
})

export default router;
