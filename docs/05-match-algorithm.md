# 05. Algoritmo de Match

> **TL;DR** — Cada usuário tem um vetor de gosto = média ponderada de (4 favoritos pinados × peso alto) + (até 15 filmes recentes 4-5★ × peso menor). Pra cada sessão, calculamos o ponto médio dos dois vetores e fazemos kNN por similaridade de cosseno no pgvector. Filmes em cooldown ou já vistos na sessão são filtrados. Pódio fecha em 3 LIKEs mútuos.

## 5.1. Embeddings semânticos (SBERT)

### Modelo
- **`sentence-transformers/all-MiniLM-L6-v2`** — 384 dimensões, 22M parâmetros, ótimo trade-off entre qualidade e velocidade.
- Alternativas avaliadas:
  - `all-mpnet-base-v2` (768 dim) — qualidade levemente superior, custo de inferência e armazenamento 2×.
  - `multi-qa-MiniLM-L6-cos-v1` — otimizado pra Q&A, não pra similaridade de descrições.
- **Decisão**: começar com MiniLM-L6 por velocidade. Trocar é simples (re-rodar embed job em todos os filmes).

### Texto que vira vetor
Pro filme, concatenamos: `title + ". " + year + ". " + overview`. Title e year dão grounding; overview tem o conteúdo semântico denso.

Exemplo:
> "Eternal Sunshine of the Spotless Mind. 2004. When their relationship turns sour, a couple undergoes a medical procedure to have each other erased from their memories..."

### Quando embedar
- **Filme novo descoberto** (worker Profile Sync identifica filme não-presente no catálogo): enfileira job `embed-movie`.
- **Re-embed em massa**: apenas se mudarmos o modelo. Job offline, não disparado no fluxo do usuário.

### Microsserviço ML
- `POST /embed` recebe `{ texts: string[] }`, retorna `{ embeddings: number[][] }`.
- Endpoint stateless. Pode rodar com 1 réplica em dev e escalar horizontalmente.
- Inferência em batch (até 32 textos por chamada) pra amortizar custo.

## 5.2. Vetor de gosto do usuário

### Composição
Calculado on-the-fly toda vez que uma sessão começa (não armazenado):

```
taste_vector(user) =
    (1 / total_weight) *
    Σ ( embedding(m) × weight(m) )
    for m in (favorites ∪ recent_diary)
```

### Pesos (configuráveis em `apps/api/src/config/match.config.ts`)

| Fonte | Quantos filmes | Peso individual |
|---|---|---|
| **Favorites** (4 pinados do Letterboxd) | até 4 | `FAVORITE_WEIGHT = 1.0` |
| **Recent Diary** (últimos 15 com 4-5★) | até 15 | `DIARY_WEIGHT = 0.4` |

Total ponderado se um usuário tem 4 favs + 15 diary: `4×1.0 + 15×0.4 = 10.0` → vetor normalizado pela soma dos pesos.

### Fallbacks
- **Usuário sem Letterboxd conectado**: usar somente votos LIKE de sessões anteriores como sinal (peso 0.2 cada).
- **Usuário com menos de 4 favs ou 15 diary**: usar o que tiver. Sem mínimo rígido — vetor pode ser ruim com 1 filme, mas é a vida.
- **Usuário com zero sinal**: cold-start. Modo Descoberta cai num pool curado (top 100 IMDB) até ter dados.

## 5.3. Ponto de encontro vetorial

Para uma sessão entre A e B:

```
meeting_point = (taste_vector(A) + taste_vector(B)) / 2
```

Esse ponto vive no mesmo espaço de 384 dimensões e representa "o gosto médio do casal".

**Por que média aritmética e não outra operação?**
- **Soma** sem normalizar enviesa pro usuário com vetor de maior magnitude.
- **Produto elemento-a-elemento** colapsa em zero rapidamente.
- **Concat** dobra a dimensão e quebra a métrica.
- **Média**: simples, justa, preserva direção, mantém dimensão. É o que a literatura de "compromise recommendation" usa.

## 5.4. Busca kNN no pgvector

```sql
SELECT
  id, title, year, posterPath,
  embedding <=> :meeting_point AS distance
FROM "Movie"
WHERE
  id NOT IN (-- já vistos nesta sessão por qualquer um dos dois
    SELECT movieId FROM "Swipe" WHERE sessionId = :session
  )
  AND id NOT IN (-- cooldown de dislike de qualquer um dos dois
    SELECT movieId FROM "DislikeCooldown"
    WHERE userId IN (:hostId, :guestId)
      AND expiresAt > NOW()
  )
  AND id NOT IN (-- já assistidos por qualquer um dos dois (modo Descoberta só)
    SELECT movieId FROM "UserMovieTaste"
    WHERE userId IN (:hostId, :guestId)
      AND source = 'DIARY'
  )
ORDER BY embedding <=> :meeting_point
LIMIT :k;
```

`<=>` é o operador de distância cosseno do pgvector (0 = idênticos, 2 = opostos).

### k = quantos candidatos por batch?
Configurável: `BATCH_SIZE = 10`. Cliente pede mais via `request-next-batch` quando a fila local cai abaixo de 3.

### Modo Limpa-Fila — variação
Em vez de busca semântica aberta, filtra primeiro pela interseção das watchlists e ordena pela proximidade ao ponto médio:

```sql
WITH intersection AS (
  SELECT movieId FROM "WatchlistItem" WHERE userId = :hostId
  INTERSECT
  SELECT movieId FROM "WatchlistItem" WHERE userId = :guestId
)
SELECT m.id, m.title, m.year, m.posterPath,
       m.embedding <=> :meeting_point AS distance
FROM "Movie" m
JOIN intersection i ON m.id = i.movieId
WHERE -- mesmos filtros de já-vistos + cooldown
ORDER BY distance
LIMIT :k;
```

## 5.5. Lógica de pódio

Pseudocódigo do gateway WS ao receber um `swipe`:

```ts
async function onSwipe(session, userId, movieId, vote) {
  await prisma.swipe.create({ data: { sessionId: session.id, userId, movieId, vote } });

  if (vote === 'DISLIKE') {
    await prisma.dislikeCooldown.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId, expiresAt: addDays(new Date(), DISLIKE_COOLDOWN_DAYS) },
      update: { expiresAt: addDays(new Date(), DISLIKE_COOLDOWN_DAYS) },
    });
    return;
  }

  // LIKE — verifica se o outro também deu LIKE no mesmo filme
  const otherUserId = session.hostId === userId ? session.guestId : session.hostId;
  const mutual = await prisma.swipe.findFirst({
    where: { sessionId: session.id, userId: otherUserId, movieId, vote: 'LIKE' },
  });

  if (!mutual) return;

  // É match!
  const currentMatches = await countMatches(session.id);
  emitToRoom(session.id, 'match', { movie: await getMovie(movieId), currentCount: currentMatches, podiumSize: PODIUM_SIZE });

  if (currentMatches >= PODIUM_SIZE) {
    await finalizeSession(session);  // marca COMPLETED + busca JustWatch + emite session:completed
  }
}
```

## 5.6. Configurações ajustáveis

Centralizadas em `apps/api/src/config/match.config.ts` (será criado na Fase 6):

```ts
export const matchConfig = {
  FAVORITE_WEIGHT: 1.0,
  DIARY_WEIGHT: 0.4,
  RECENCY_BIAS_WINDOW: 15,        // últimos N filmes do diário considerados
  MIN_RATING_FOR_TASTE: 8,        // escala 0-10 (4★ no Letterboxd = 8)
  PODIUM_SIZE: 3,
  DISLIKE_COOLDOWN_DAYS: 15,
  BATCH_SIZE: 10,
  MIN_QUEUE_BEFORE_REFETCH: 3,
};
```

## 5.7. Avaliação offline (planejado pós-MVP)

Ideias de métrica pra calibrar pesos sem A/B test:
- Pares de filmes "irmãos" (mesma franquia, mesmo diretor) deveriam ter distância média menor que pares aleatórios.
- Reconstruir o vetor do usuário deixando 1 filme de fora e checar se ele aparece no top-20 — recall@20 como métrica.

Não vai ser implementado no v1, mas o pipeline tá estruturado pra suportar quando precisar.

## 5.8. Por que não X?

- **Por que não filtrar por gênero / país de origem?** Porque a tese do produto é justamente capturar nuance além de tags. Filtros explícitos viram opção avançada na UI, não default.
- **Por que não usar collaborative filtering?** Cold-start brutal num app novo. SBERT em sinopses funciona desde o primeiro filme cadastrado.
- **Por que não treinar embeddings próprios?** Custo absurdo de dados rotulados pra ganho marginal. SBERT pré-treinado é state of the art pra esse caso.
- **Por que não armazenar o vetor do usuário?** Toda mudança no perfil (filme novo no diário, fav alterado) invalidaria. Calcular on-the-fly num lobby leva <10ms — não vale a complexidade da invalidação.
