import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
```

5. Clique em **"Commit changes"**

### Passo 4: Deploy

1. Volte ao Vercel
2. Clique em **Deploy** (ou vá em Deployments → Redeploy)

---

## Resumo visual:
```
❌ ERRADO:
Key: projects/36140631926
Value: I9JU23NF394R6HH

✅ CORRETO:
Key: GEMINI_API_KEY
Value: AIzaSyxxxxxxxxxxxxxxxxxx (sua chave real)
