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
        // Declare every dep that is only reachable through the component tree,
        // so they all land in Vite's first optimise pass. Discovered late, they
        // trigger a re-optimise mid-run: React gets re-bundled under a new hash
        // while the already-loaded copy stays, and hooks then read from the
        // wrong instance — "Cannot read properties of null (reading
        // 'useContext')". Two chunk hashes in one stack trace is that bug.
        optimizeDeps: {
          include: [
            'react',
            'react-dom',
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
          ],
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
    // One retry in CI only. The timeouts above are deliberately tight for local
    // speed, but CI runners are slower — the long-polling specs and the first
    // spec's cold Vite compile both sit close to the limit there.
    retries: {
      runMode: 1,
      openMode: 0
    }
  },
}) 