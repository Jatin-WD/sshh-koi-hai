import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Hostinger's managed Node routing protects root-level static asset paths.
  // Keep production bundles under the already-routed /api namespace.
  base: process.env.NODE_ENV === "production" ? "/api/_assets/" : "/",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:4000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
