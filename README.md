# Mindstrat Prospector

CRM de prospecção com login, mensagens prontas para enviar no WhatsApp, busca de empresas no Google Maps (Apify) e roteiros comerciais por segmento.

## Publicar na Vercel (o projeto já existe lá)

O projeto `conecta-prospector` já foi criado na sua conta da Vercel, com as variáveis do Supabase configuradas. Falta só enviar o código. Na pasta do projeto, no terminal:

```bash
npm install
npx vercel link      # escolha o projeto conecta-prospector
npx vercel --prod
```

No fim aparece o link (algo como `conecta-prospector.vercel.app`).

## Depois do primeiro deploy (uma vez só)

No painel do Supabase, projeto **conecta-prospector**, em **Authentication › URL Configuration**:
- **Site URL**: cole o link da Vercel.
- **Redirect URLs**: adicione o mesmo link.

Sem isso, o link de confirmação de e-mail abre em localhost. Depois de criar a sua conta, você pode desligar novos cadastros em **Authentication › Sign In / Providers** para ninguém mais criar conta.

## Variáveis de ambiente

| Variável | Para quê | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Banco e login | Sim (já configurada) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Banco e login | Sim (já configurada) |
| `APIFY_TOKEN` | Buscar empresas no Google Maps | Não: dá para colar o token dentro da ferramenta |
| `ANTHROPIC_API_KEY` | Gerador de scripts com IA | Não: sem ela a aba de IA fica escondida |

## Rodar no computador

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Onde mexer

| Quero mudar | Arquivo |
|---|---|
| Mensagens prontas do WhatsApp | `src/lib/prontas.ts` |
| Argumentos de cada segmento | `src/lib/catalogo.ts` |
| Roteiros de ligação e objeções | `src/lib/biblioteca.ts` |
| Regras da IA | `src/lib/prompt.ts` |
| Busca na Apify | `src/app/api/apify/` |
| Banco de dados | `src/lib/store.ts` (tabelas `leads`, `scripts`, `config` no Supabase) |
