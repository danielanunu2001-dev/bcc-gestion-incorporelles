import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: '0.0.0.0', // 🔥 IMPORTANT : Permet les tests sur mobile/tablette
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    },
    // Optimisations pour le développement mobile
    hmr: {
      overlay: true, // Affiche les erreurs clairement
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    // Optimisations pour le mobile
    target: 'es2015', // Supporte tous les appareils modernes
    cssCodeSplit: true, // CSS plus léger
    assetsInlineLimit: 4096, // Petites images en base64 (gain de requêtes)
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['react-redux', '@reduxjs/toolkit'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'chart-vendor': ['recharts'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'yup'],
          'utils-vendor': ['axios', 'lodash', 'localforage'],
        },
        // Optimisation pour le chargement sur mobile
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Compression pour mobile (réseau potentiellement lent)
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    logOverride: { 
      'ts(1261)': 'silent',
      'duplicate-object-key': 'silent'
    },
    // Optimisations pour mobile
    treeShaking: true,
    legalComments: 'none', // Enlève les commentaires pour réduire la taille
  },
  // Optimisation CSS
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      // Si vous utilisez SCSS un jour
    },
  },
  // Optimisation du preview
  preview: {
    port: 4173,
    host: '0.0.0.0', // Pour tester en production sur mobile
    strictPort: true,
  },
  // Définition des variables d'environnement
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
})