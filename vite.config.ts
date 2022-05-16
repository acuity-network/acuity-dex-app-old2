import { defineConfig } from 'vite'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import vue from '@vitejs/plugin-vue'
import vuetify from '@vuetify/vite-plugin'

const path = require('path')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    nodePolyfills(),
    vue(),
    vuetify({
      autoImport: true,
    }),
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      process: "process/browser",
      '@': path.resolve(__dirname, 'src'),
    },
  },

  /* remove the need to specify .vue files https://vitejs.dev/config/#resolve-extensions
  resolve: {
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ]
  },
  */
})
