import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
          if (id.includes("/src/api.ts")) {
            return "api";
          }
          if (id.includes("/src/LandingPage.tsx")) {
            return "landing";
          }
          if (id.includes("/src/views/DashboardView.tsx")) {
            return "dashboard";
          }
          if (id.includes("/src/views/ReportTabsNav.tsx")) {
            return "reports-nav";
          }
          if (id.includes("/src/views/ReportsRepassesView.tsx")) {
            return "reports-repasses";
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        secure: false
      },
      "/health": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: ["frontend-production-fc41.up.railway.app"]
  }
});
