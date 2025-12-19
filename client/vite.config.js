import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig({
  plugins: [
    react(),
    // FIX: Check for .default to handle the import compatibility issue
    (monacoEditorPlugin.default || monacoEditorPlugin)({
      languageWorkers: [
        'editorWorkerService',
        'json',
        'css',
        'html',
        'typescript'
      ]
    })
  ],
  server: {
    host: true,
    port: 3000
  }
});