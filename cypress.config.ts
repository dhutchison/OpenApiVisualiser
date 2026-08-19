import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        baseUrl: "http://127.0.0.1:4200",
        video: false,
        specPattern: 'cypress/integration/*_spec.js',
        supportFile: false,
    },
})
