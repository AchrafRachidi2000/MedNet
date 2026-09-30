import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4317",
    viewport: { width: 1512, height: 982 },
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node server.mjs",
    url: "http://127.0.0.1:4317",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
