import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// On GitHub Pages the app is served from https://<user>.github.io/kio/,
// so production builds need the "/kio/" base path. Local dev stays at "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/kio/" : "/",
  plugins: [react()],
}));
