import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig({
  base: './', 

  plugins: [
    react(),
    (monacoEditorPlugin.default || monacoEditorPlugin)({
      languageWorkers: [
        'editorWorkerService',
        'json',
        'css',
        'html',
        'typescript'
      ],
      publicPath: 'monacoeditorwork' 
    })
  ],
  server: {
    host: true,
    port: 3000
  }
});