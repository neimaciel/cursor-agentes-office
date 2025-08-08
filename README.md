## Agentes Office — SaaS multi-tenant jurídico

Stack: Next.js 14 (TS, App Router, Tailwind), Supabase (Auth/DB/Storage/Edge Functions), Drizzle ORM, MCP (Edge), OpenAI, Vercel, pnpm.

### Estrutura
- `apps/web`: Frontend Next.js
- `packages/db`: Schema Drizzle
- `supabase/schema.sql`: DDL + RLS + Seeds
- `supabase/functions/mcp-supabase`: Função Edge MCP

### Variáveis de Ambiente
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_FUNCTION_URL
- NEXT_PUBLIC_DEMO_ORG_ID (ex.: demo-org)
- OPENAI_API_KEY (Edge)
- SUPABASE_URL (Edge)
- SUPABASE_SERVICE_ROLE_KEY (Edge)

### Setup local
1. pnpm install
2. Configurar `.env.local` em `apps/web` com as variáveis NEXT_PUBLIC_*
3. Rodar dev: `pnpm dev`

### Supabase
1. Criar bucket público `outputs`
2. Aplicar `supabase/schema.sql`
3. Deploy da função Edge `mcp-supabase` com envs (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

### Deploy Vercel
1. Conectar GitHub
2. Definir envs NEXT_PUBLIC_*
3. Build automático

### MCP (Ferramentas)
- agents.list(orgId)
- agents.getConfig(orgId, agentKey)
- agents.toggle(orgId, agentKey, enabled)
- agents.run(orgId, agentKey, input) → salva Markdown em `outputs/{orgId}/{agentKey}/...`
- storage.putText(bucket, path, text)
- storage.getUrl(bucket, path)

### Roadmap
- Mini-CRM (Kanban, Clientes, Fichas)
- Auditoria e uso no Dashboard
- Testes Vitest + Playwright

