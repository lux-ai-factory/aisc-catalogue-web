/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // The path the build is served under, e.g. "/project-catalogue/" behind the
  // AISC launcher. Read at build time; "/" by default.
  base: process.env.CATALOGUE_BASE || "/",
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
