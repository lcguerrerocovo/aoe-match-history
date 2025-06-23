import { defineConfig } from 'cypress'

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
      viteConfig: {
        define: {
          'process.env.NODE_ENV': '"test"'
        }
      }
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false
  },
}) 