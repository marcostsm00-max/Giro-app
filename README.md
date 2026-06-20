# Meu Giro

App de controle pessoal de giro/revenda (estoque, vendas, lucro, ROI).

## Como publicar (gratuito, ~2 minutos)

### Opção A — Vercel (recomendado)

1. Crie uma conta em https://vercel.com (pode usar login do Google/GitHub)
2. Clique em "Add New Project"
3. Quando perguntar a origem, escolha "Upload" (ou suba esta pasta para um repositório no GitHub e conecte)
4. A Vercel detecta automaticamente que é um projeto Vite — não precisa configurar nada
5. Clique em "Deploy"
6. Em ~1 minuto você terá uma URL do tipo `meu-giro.vercel.app`

### Opção B — Netlify

1. Crie conta em https://netlify.com
2. Arraste a pasta do projeto (depois de rodar `npm run build`, arraste a pasta `dist`) em "Sites" → "Deploy manually"
3. Pronto, URL gerada automaticamente

## Como testar localmente antes (opcional)

```
npm install
npm run dev
```

Abre em http://localhost:5173

## Adicionar à tela inicial do iPhone

1. Abra a URL publicada no Safari
2. Toque no ícone de compartilhar
3. "Adicionar à Tela de Início"

O app funciona como PWA — fica com ícone próprio e funciona até offline.

## Sobre os dados

Os dados (produtos e vendas) ficam salvos no `localStorage` do navegador, direto no seu celular.
Isso significa:
- Não precisa de internet pra usar
- Os dados não saem do seu aparelho (privacidade total)
- Se limpar os dados do navegador/Safari, ou desinstalar e reinstalar, os dados são perdidos
- Não sincroniza entre celular e computador automaticamente (são bancos de dados separados por navegador/aparelho)

Se no futuro quiser sincronizar entre dispositivos, dá para adicionar um backend (Firebase, Supabase) depois.
