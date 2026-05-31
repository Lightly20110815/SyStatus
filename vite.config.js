import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite 只负责前端构建与开发服务器。
// 开发时所有 /api 请求被代理到本地 Node 服务（默认 4823 端口）。
// 生产 / 桌面快捷方式模式下，Node 服务直接托管 dist 与 /api，不经过 Vite。
const SERVER_PORT = process.env.PORT || 4823;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // recharts 体积较大，本地工具一次性加载，无需为这点体积告警。
    chunkSizeWarningLimit: 1200,
  },
});
