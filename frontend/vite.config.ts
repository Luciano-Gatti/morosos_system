import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/xlsx/")) return "export-xlsx";
          if (
            id.includes("/node_modules/jspdf/")
            || id.includes("/node_modules/jspdf-autotable/")
            || id.includes("/node_modules/html2canvas/")
            || id.includes("/node_modules/dompurify/")
          ) return "export-pdf";
          if (id.includes("/node_modules/recharts/")) return "charts";
          return undefined;
        },
      },
    },
  },
}));
