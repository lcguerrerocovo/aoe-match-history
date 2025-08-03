import { defineConfig } from 'cypress'

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
      viteConfig: {
        define: {
          'process.env.NODE_ENV': '"test"'
        },
        // Optimize Vite for faster builds
        build: { minify: false },
        server: { hmr: false }
      }
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false,
    // Reduce timeouts for faster test execution
    defaultCommandTimeout: 4000,
    requestTimeout: 5000,
    responseTimeout: 5000,
    // Disable video recording and screenshots for faster runs
    video: false,
    screenshotOnRunFailure: false
  },
}) 