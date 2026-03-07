import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import { z3Plugin } from "@sigmasd/vite-plugin-z3";

export default defineConfig({
  plugins: [
    z3Plugin({ generateExample: false }),
    fresh(),
    tailwindcss(),
  ],
});
