# Relatório de Correção — PlayHub

Data: 2026-06-01

## Causa raiz identificada

O problema dos textos quebrados não nasceu da organização de rotas em si. Ele foi causado por correções anteriores feitas via comandos de terminal/PowerShell que salvaram arquivos com mistura de caracteres UTF-8 e mojibake, principalmente em:

- `src/components/layout/AppHeader.tsx`
- `src/components/layout/ProfileView.tsx`

Exemplos encontrados:

- `HistÃ³rico`
- `ConfiguraÃ§Ãµes`
- `ConexÃƒÆ’Ã‚Âµes`
- `participaÃ§Ãµes`
- `opÃ§Ã£o`

## Correções aplicadas

### 1. Textos/encoding

Foram corrigidos os textos quebrados em `AppHeader.tsx` e `ProfileView.tsx`, preservando acentos corretos em português.

### 2. Rotas organizadas

Estrutura aplicada:

- `/mapa` → página inicial/home do app
- `/feed` → Feed/comunidade
- `/historico` → Histórico
- `/reservas` → Reservas
- `/perfil` → Perfil/configurações
- `/inicio` → redireciona para `/mapa`

### 3. Remoção de efeito colateral em renderização

As páginas `/historico` e `/reservas` não escrevem mais em `localStorage` durante a renderização.

Agora usam:

- `<ProfileView initialTab="historico" />`
- `<ProfileView initialTab="reservas" />`
- `<ProfileView initialTab="config" />`

Isso reduz risco de erro de hidratação do Next.js.

### 4. Barra inferior

`BottomNav.tsx` agora aponta Feed para `/feed`, não mais para `/inicio`.

### 5. Tipos Supabase

`src/lib/types/supabase.ts` recebeu tipos mínimos para `games` e `game_players`, porque `npm run type-check` quebrava em `supabaseGames.ts` por falta dessas tabelas no tipo `Database`.

## Validações feitas

- `npm run type-check`: aprovado.
- Busca por caracteres quebrados nos arquivos de layout/rotas: limpa.
- `next build`: compilação e checagem de tipos passaram; o processo foi interrompido na etapa de coleta de dados por limitação do ambiente sandbox (`EPIPE`), não por erro de TypeScript/código.

## Arquivos principais alterados

- `src/components/layout/AppHeader.tsx`
- `src/components/layout/ProfileView.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/app/(app)/feed/page.tsx`
- `src/app/(app)/inicio/page.tsx`
- `src/app/(app)/historico/page.tsx`
- `src/app/(app)/reservas/page.tsx`
- `src/app/(app)/perfil/page.tsx`
- `src/lib/types/supabase.ts`

## Próximo teste recomendado

1. Substituir a pasta atual pela pasta corrigida.
2. Restaurar seu `.env.local` se ele não estiver na pasta corrigida.
3. Rodar:

```powershell
npm install
cmd /c "npm run dev -- --hostname 0.0.0.0 --port 3002"
```

4. Testar:

- `/mapa`
- `/feed`
- `/historico`
- `/reservas`
- `/perfil`

