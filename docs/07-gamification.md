# 07. Gamificação e Regras de Negócio

> **TL;DR** — Três mecânicas core: pódio de 3 matches (não fecha no primeiro pra manter o engajamento), cooldown de 15 dias em dislike (não pune permanentemente), e JustWatch só ao final (cria valor utilitário e gatilho premium). Todos os números são constantes configuráveis em um único arquivo.

## 7.1. Pódio de 3 matches

### Regra
A sessão **não fecha no primeiro match mútuo**. Ela continua aceitando swipes até acumular exatamente `PODIUM_SIZE = 3` matches mútuos. Aí marca `status = COMPLETED` e libera o resultado.

### Por que
- O primeiro match é frequentemente "ok, esse serve" — não a melhor escolha.
- Acumulando 3 opções, o casal tem **escolha final humana** sobre qual assistir.
- Mantém o loop de swipe ativo, aumentando engagement e dwell time.
- Cria um "momento de revelação" no fim (os 3 finalistas + onde assistir cada um) — design de jogo clássico.

### UX implicada
- Indicador de progresso visível (1/3, 2/3, 3/3) durante a sessão.
- Mensagem "match!" com confete moderado a cada um.
- Tela de pódio final com os 3 filmes lado a lado + plataformas de streaming.

## 7.2. Cooldown de dislike

### Regra
Quando um usuário dá DISLIKE em um filme, ele entra em "cooldown" por `DISLIKE_COOLDOWN_DAYS = 15` dias. Filmes em cooldown são **excluídos dos candidatos** em qualquer sessão futura desse usuário (em qualquer parceria).

### Por que
- Sem cooldown, o mesmo filme rejeitado reapareceria toda sessão → frustração.
- Cooldown permanente "pune" o catálogo — talvez o usuário esteja só sem clima hoje, e queira o filme daqui a 2 meses.
- 15 dias é um chute educado: tempo suficiente pra mudar de humor, curto o bastante pra eventualmente ressurgir.

### Implementação
- Soft data: tabela `DislikeCooldown(userId, movieId, expiresAt)`.
- Query de candidatos exclui via `WHERE NOT IN (SELECT movieId FROM DislikeCooldown WHERE userId = :u AND expiresAt > NOW())`.
- Cleanup periódico: job `purge-cooldowns` roda 1×/dia removendo entradas expiradas (puramente housekeeping, não afeta lógica).

### Edge cases
- Dois usuários, A dá dislike num filme X, B dá like em sessão posterior: o filme X **continua excluído** das sessões de A, mas pode aparecer em sessões de B com outro parceiro.
- A spec original sugere "soft delete" — usamos a tabela `DislikeCooldown` em vez de coluna no Swipe pra deixar a regra explícita e fácil de tunar.

## 7.3. JustWatch — somente no pódio

### Regra
A consulta à API JustWatch (pra obter em quais plataformas cada filme está disponível) é feita **apenas quando o pódio fecha**, não durante o swipe.

### Por que
- Custo: JustWatch API tem rate limits. Consultar pra cada filme exibido (10 por batch, dezenas por sessão) explode rapidamente.
- UX: revela o "onde assistir" só no momento da decisão final — funciona como recompensa.
- Premium gating natural: filtrar por provider *antes* do swipe vira feature paga (ver §7.4).

### Implementação
- Ao detectar o 3º match, gateway WS dispara `enrichPodiumWithProviders(podium)`.
- Função faz 3 chamadas paralelas à JustWatch (uma por filme).
- Resultado é mergeado no payload `session:completed`.
- Falha de JustWatch não bloqueia o pódio — emite com `providers: []` e flag `enrichmentFailed: true`.

## 7.4. Premium gating

### Diferença free vs premium

| Feature | Free | Premium |
|---|---|---|
| Match sessions | até `FREE_TIER_MATCH_LIMIT = 3` por mês | ilimitado |
| Histórico detalhado de sessões | últimas 5 | full |
| Filtro de provider pré-swipe ("só Netflix") | ❌ | ✅ |
| Modo Híbrido (pós-MVP) | ❌ | ✅ |

### `FREE_TIER_MATCH_LIMIT` é configurável

Constante única em `apps/api/src/config/gameplay.config.ts`. Valor inicial: **3**. Plano explícito do produto é reduzir pra **1** depois que o produto ganhar tração — alterar só essa constante e redeploy.

```ts
// apps/api/src/config/gameplay.config.ts
export const gameplayConfig = {
  PODIUM_SIZE: 3,
  DISLIKE_COOLDOWN_DAYS: 15,
  FREE_TIER_MATCH_LIMIT: 3,        // <- drops to 1 in production later
  FREE_TIER_PERIOD: 'MONTHLY',     // 'MONTHLY' | 'WEEKLY' | 'DAILY'
  FREE_HISTORY_LIMIT: 5,
};
```

Override via env var (`FREE_TIER_MATCH_LIMIT=1`) pra mudar sem deploy.

### Onde o gating é aplicado
- Criação de sessão (`session:create` WS event): se usuário free e atingiu o limite, retorna `error: { code: 'FREE_LIMIT_REACHED' }`.
- Endpoint `/api/v1/sessions` (listagem): trunca em `FREE_HISTORY_LIMIT` se usuário free.

### Tracking de uso
- Tabela `MatchSession` já tem `createdAt`. Contagem é query simples:
  ```sql
  SELECT COUNT(*) FROM "MatchSession"
  WHERE (hostId = :u OR guestId = :u)
    AND status = 'COMPLETED'
    AND createdAt >= :periodStart;
  ```
- Cache pra performance: contagem em Redis com TTL até o próximo reset do período.

## 7.5. Outras tunables

Todas as constantes ajustáveis do produto, em um só lugar:

```ts
// apps/api/src/config/gameplay.config.ts
export const gameplayConfig = {
  // Match flow
  PODIUM_SIZE: 3,
  BATCH_SIZE: 10,
  MIN_QUEUE_BEFORE_REFETCH: 3,

  // Cooldown
  DISLIKE_COOLDOWN_DAYS: 15,

  // Profile / taste vector
  FAVORITE_WEIGHT: 1.0,
  DIARY_WEIGHT: 0.4,
  RECENCY_BIAS_WINDOW: 15,
  MIN_RATING_FOR_TASTE: 8,         // 0-10 scale

  // Free tier
  FREE_TIER_MATCH_LIMIT: 3,
  FREE_TIER_PERIOD: 'MONTHLY',
  FREE_HISTORY_LIMIT: 5,

  // Session lifecycle
  SESSION_IDLE_TIMEOUT_MIN: 30,    // auto ABANDONED
  SESSION_DISCONNECT_GRACE_SEC: 60, // tempo pra reconectar antes de abandonar
};
```

Cada uma dessas constantes tem que sobrescrever via env var. Helper utilitário lê env primeiro, default depois.

## 7.6. Por que não X?

- **Por que não pódio variável (3, 5, 7)?** Adicionar opção é UX adicional sem dado pra justificar. Travar em 3 no MVP e validar.
- **Por que não fechar a sessão no 1º match com opção de "continuar"?** Confunde o loop. Pódio fixo é mais claro.
- **Por que não cooldown configurável por usuário?** Premature optimization. Constante global resolve 95% dos casos.
- **Por que não usar TMDB pra streaming providers em vez de JustWatch?** TMDB tem providers mas dados são incompletos e desatualizados em vários países. JustWatch é o padrão da indústria.
