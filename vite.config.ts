import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base configuration
const baseConfig = {
  plugins: [
    react(),
  ],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, 'client/src')
      },
      {
        find: '@shared',
        replacement: path.resolve(__dirname, 'shared')
      },
      {
        find: '@assets',
        replacement: path.resolve(__dirname, 'attached_assets')
      }
    ]
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'client/index.html')
      }
    }
  },
};

// Development configuration
const devConfig = {
  ...baseConfig,
  server: {
    port: 5000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
};

// Production configuration
const prodConfig = {
  ...baseConfig,
  base: '/', // Ensure assets are loaded from the root
};

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    return devConfig;
  } else {
    return prodConfig;
  }
});
