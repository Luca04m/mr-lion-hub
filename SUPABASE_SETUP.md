# Supabase Setup - MR. LION HUB

## 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote a **Project URL** e a **anon public key** (em Settings > API)

## 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**No Lovable:** Vá em Settings > Integrations > Supabase e conecte seu projeto.

## 3. Executar a migration

No SQL Editor do Supabase, cole e execute o conteúdo de:
```
supabase/migrations/001_initial_schema.sql
```

Isso cria:
- Tabelas: `tasks`, `activities`, `meetings`, `revendedores`, `business_kpis`, `presence`, `id_counter`
- RLS policies (acesso público para anon)
- Realtime habilitado em todas as tabelas
- Storage bucket `attachments` para uploads de arquivos
- Função `get_next_id()` para IDs atômicos

## 4. Habilitar Realtime

No dashboard do Supabase:
1. Vá em **Database > Replication**
2. Certifique-se de que as tabelas `tasks`, `activities`, `meetings`, `revendedores`, `presence`, `business_kpis` estão habilitadas

## 5. Deploy

O app funciona em modo híbrido:
- **Com Supabase configurado:** dados são persistidos no banco e sincronizados em tempo real entre todos os usuários
- **Sem Supabase:** funciona como antes, apenas com localStorage (sem sync entre usuários)

Na primeira vez que o app carrega com Supabase, ele automaticamente faz seed dos dados iniciais.

## Como funciona

1. **Escrita**: dados são salvos no localStorage (UI instantânea) E no Supabase (persistência)
2. **Leitura**: dados vêm do localStorage (rápido)
3. **Sync**: Supabase Realtime notifica quando outro usuário faz uma mudança → atualiza localStorage → UI re-renderiza
4. **Uploads**: arquivos vão para Supabase Storage (em vez de base64 no localStorage)
