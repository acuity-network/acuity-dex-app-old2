<script setup lang="ts">
import { ref } from 'vue'
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import HelloWorld from './components/HelloWorld.vue'

const menu = ref([
  {
    to: '/about',
    icon: 'mdi-information',
    title: 'About',
  },
  {
    to: '/features',
    icon: 'mdi-feature-search',
    title: 'Features',
  },
  {
    to: '/parachains',
    icon: 'mdi-expansion-card-variant',
    title: 'Parachains',
  },
  {
    to: '/regenesis',
    icon: 'mdi-rocket-launch',
    title: 'Regenesis',
  },
  {
    to: '/acu',
    icon: 'mdi-cash-usd',
    title: 'ACU',
  },
  {
    to: '/atomic-swap',
    icon: 'mdi-atom-variant',
    title: 'Atomic Swap',
  },
  {
    to: '/roadmap',
    icon: 'mdi-timeline-text',
    title: 'Roadmap',
  },
  {
    to: '/tech-stack',
    icon: 'mdi-server-network',
    title: 'Tech Stack',
  },
  {
    to: '/blog',
    icon: 'mdi-format-quote-open',
    title: 'Blog',
  },
]);

</script>

<template>
  <v-app id="inspire">
    <v-navigation-drawer
      app
    >
      <v-list dense>
        <v-list-item
          v-for="menuItem in menu"
          :key="menuItem.icon"
          :to="menuItem.to"
        >
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar
      app
      dark
    >
      <v-toolbar-title>ACUITY</v-toolbar-title>
    </v-app-bar>

    <v-main>
<!--
      <v-btn v-if="showFab" fixed dark fab bottom right color="#E6007A" to="/support">
        <v-icon>mdi-gift</v-icon>
      </v-btn>
-->

      <v-text-field label="Regular"></v-text-field>
    </v-main>
  </v-app>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
