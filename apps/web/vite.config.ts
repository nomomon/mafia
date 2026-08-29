import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  server: {
    proxy: {
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
      },
    },
  },
});
