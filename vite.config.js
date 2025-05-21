import { defineConfig, loadEnv } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables based on mode
  const env = loadEnv(mode, process.cwd());
  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:8080";

  return {
    plugins: [
      svelte({
        onwarn: (warning, handler) => {
          // Ignore specific warnings
          if (warning.code === 'css-unused-selector' || 
              warning.code === 'element-implicitly-closed' ||
              warning.code === 'export_let_unused') {
            return;
          }
          // Let Svelte handle all other warnings normally
          handler(warning);
        }
      })
    ],
    server: {
      proxy: {
        // Proxy API requests to backend to avoid CORS issues
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
      cors: true, // Enable CORS for development server
    },
    build: {
      // Generate source maps for better debugging
      sourcemap: true,
    },
    css: {
      // Disable CSS modules
      modules: false,
    },
    resolve: {
      alias: {
        $lib: path.resolve("./src/lib"),
      },
    },
  };
});
