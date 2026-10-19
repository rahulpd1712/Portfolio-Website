import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { contentRenderer } from './build/render-content.js';

// Base is relative so the production build works both on a domain root
// and under a repository path (e.g. GitHub Pages /username/repo/).
export default defineConfig(() => {
  // Every projects/<slug>/index.html becomes a build entry automatically;
  // create the folder and a matching slug in content/site.json - no config edit.
  const projectEntries = {};
  const projectsDir = path.join(process.cwd(), 'projects');
  if (fs.existsSync(projectsDir)) {
    for (const name of fs.readdirSync(projectsDir)) {
      const html = path.join(projectsDir, name, 'index.html');
      if (fs.existsSync(html)) projectEntries[name] = html;
    }
  }

  return {
    base: './',
    plugins: [contentRenderer()],
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          ...projectEntries
        }
      }
    }
  };
});
