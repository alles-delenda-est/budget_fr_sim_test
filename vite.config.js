import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Empreinte du commit : variable Vercel si présente, sinon git (construction locale), sinon « dev ».
function commitHash() {
  const vercel = process.env.VERCEL_GIT_COMMIT_SHA
  if (vercel) return vercel.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev'
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Constantes injectées à la construction (voir src/version.js). En développement local : « dev ».
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(command === 'build' ? commitHash() : 'dev'),
    __BUILD_DATE__: JSON.stringify(command === 'build' ? new Date().toISOString().slice(0, 10) : 'dev'),
  },
}))
