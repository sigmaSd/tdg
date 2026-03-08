import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import { z3Plugin } from "@sigmasd/vite-plugin-z3";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "node:child_process";

const commitCount = execSync("git rev-list --count HEAD").toString().trim();

let versionLogged = false;
function logVersion() {
  return {
    name: "log-version",
    buildStart() {
      if (!versionLogged) {
        console.log(`\n  Building Tableau de Garde v${commitCount}\n`);
        versionLogged = true;
      }
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(commitCount),
  },
  plugins: [
    logVersion(),
    z3Plugin({ generateExample: false }),
    fresh(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: [
        "favicon.ico",
        "logo.svg",
        "z3-built.js",
        "z3-built.wasm",
        "z3-wrapper.js",
        "scheduler-worker.js",
      ],
      manifest: {
        name: "Tableau de Garde",
        short_name: "TdG",
        description: "Scheduling tool for on-call duty planning",
        theme_color: "#FFDB1E",
        background_color: "#1a1a2e",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024, // 40MB for z3 wasm
        globPatterns: ["**/*.{js,css,html,svg,png,ico,wasm}"],
        navigateFallback: null, // SSR handles navigation, not the SW
        runtimeCaching: [
          {
            // Cache navigation requests (SSR pages) with NetworkFirst
            urlPattern: ({ request }: { request: Request }) =>
              request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
