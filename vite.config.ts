import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // The web app lives in client/ (index.html + src/); the build output
  // goes to dist/ at the project root for Render static hosting.
  root: path.join(projectRoot, "client"),
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.join(projectRoot, "dist"),
    emptyOutDir: true,
  },
});
