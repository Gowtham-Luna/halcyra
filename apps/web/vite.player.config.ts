import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds the standalone SCORM player bundle with deterministic filenames
// into public/scorm-player/, where the export flow (src/lib/scorm/) fetches
// them to assemble the zip. Run via: npm run build:player
export default defineConfig({
  plugins: [react()],
  root: "standalone",
  base: "./",
  build: {
    outDir: "../public/scorm-player",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "player.js",
        chunkFileNames: "player-[name].js",
        assetFileNames: "player.[ext]",
      },
    },
  },
});
