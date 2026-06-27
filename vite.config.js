import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",

    allowedHosts: [
      "a1d2-105-160-45-187.ngrok-free.app"
    ],

    proxy: {
      "/tickomag": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
      },
      "/functions-api": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/functions-api/, ""),
      },
    },
  },
});
