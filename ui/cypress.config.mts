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
    defaultCommandTimeout: 2000,
    requestTimeout: 3000,
    responseTimeout: 3000,
    // Disable video recording and screenshots for faster runs
    video: false,
    screenshotOnRunFailure: false,
    // Disable animations for faster rendering
    animationDistanceThreshold: 0,
    // Optimize for speed
    watchForFileChanges: false,
    retries: {
      runMode: 0,
      openMode: 0
    }
  },
}) 