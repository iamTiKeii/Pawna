import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the current directory
  const env = loadEnv(mode, process.cwd(), '');
  let apiTarget = env.VITE_API_URL || 'https://pawna-prod.up.railway.app';

  // Tự động chuyển HTTP -> HTTPS cho server Production trên Railway để tránh 301 Redirect gây lỗi CORS
  if (apiTarget.startsWith('http://') && apiTarget.includes('railway.app')) {
    apiTarget = apiTarget.replace('http://', 'https://');
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'https://pawna-prod.up.railway.app',
          changeOrigin: true,
          secure: true,
        }
      }
    }
  };
})

