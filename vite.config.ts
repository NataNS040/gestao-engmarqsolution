import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "supabase":     ["@supabase/supabase-js"],
          "query":        ["@tanstack/react-query"],
          "charts":       ["recharts"],
          "pdf":          ["jspdf", "jspdf-autotable"],
          "xlsx":         ["xlsx"],
        },
      },
    },
  },
});
