import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import handleCreateOrder from './api/create-order.ts'
import handleVerifyPayment from './api/verify-payment.ts'
import handleAdminUploadImage from './api/admin/upload-image.ts'

function razorpayDevApi() {
  return {
    name: 'razorpay-dev-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];
        if (url === '/api/create-order') {
          return handleCreateOrder(req, res);
        }
        if (url === '/api/verify-payment') {
          return handleVerifyPayment(req, res);
        }
        if (url === '/api/admin/upload-image') {
          return handleAdminUploadImage(req, res);
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), razorpayDevApi()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('purify') || id.includes('pdf-lib')) {
              return 'vendor-pdf';
            }
            if (id.includes('jszip')) {
              return 'vendor-zip';
            }
            if (id.includes('qrcode')) {
              return 'vendor-qr';
            }
            if (id.includes('xlsx') || id.includes('sheetjs')) {
              return 'vendor-excel';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router/') ||
              id.includes('/react-router-dom/') ||
              id.includes('\\react\\') ||
              id.includes('\\react-dom\\') ||
              id.includes('\\react-router\\') ||
              id.includes('\\react-router-dom\\')
            ) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
})
