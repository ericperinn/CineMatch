# 01. Visão Geral do Produto

> **TL;DR** — CineMatch é um "Tinder de filmes" para casais e grupos. Dois usuários conectados deslizam (like/dislike) sobre filmes filtrados por IA até acumular 3 matches mútuos (pódio). O objetivo é resolver o impasse de "qual filme a gente vê?" usando similaridade semântica entre gostos, não tags rígidas de gênero.

## 1.1. Problema

Casais e grupos perdem em média **15-30 minutos** decidindo o que assistir antes de cada sessão. As soluções atuais (catálogos das próprias plataformas de streaming, listas curadas, recomendações algorítmicas isoladas por usuário) falham porque:

- Otimizam para **um usuário só**, não pra interseção de gostos.
- Dependem de **tags rígidas** (gênero, ano) que não capturam nuance.
- Não levam em conta o **catálogo atual** das plataformas que o grupo assina.

## 1.2. Solução

Uma sessão gamificada onde:

1. Dois usuários entram num lobby compartilhado (via WebSockets).
2. O sistema calcula o **ponto médio dos vetores de gosto** de cada um (gerados via SBERT a partir dos perfis Letterboxd).
3. O algoritmo busca os filmes mais próximos desse ponto médio no banco vetorial.
4. Os usuários votam (like/dislike) nos filmes apresentados.
5. Quando **3 likes mútuos** acumulam, a sessão fecha — o sistema consulta o JustWatch e devolve em quais plataformas cada filme está disponível.

## 1.3. Modos de Jogo

### Modo Descoberta (core)
Recomendações geradas por IA semântica cruzando o histórico de gosto de ambos. Indicado quando os usuários querem "descobrir" algo novo.

### Modo Limpa-Fila (Watchlist)
Cruza apenas filmes que ambos os usuários têm na **watchlist do Letterboxd**. Indicado quando os dois já têm uma fila grande e querem "decidir entre o que já existe". Mais leve computacionalmente — pura interseção de conjuntos + ordenação pela proximidade semântica.

### Modo Híbrido *(pós-MVP)*
Combina os dois: prioriza filmes da watchlist e completa com sugestões de IA. Liberado depois que os modos individuais estiverem estáveis.

## 1.4. Personas

| Persona | Perfil | Necessidade primária |
|---|---|---|
| **Casal cinéfilo** | Usa Letterboxd ativamente, tem gostos divergentes | Modo Descoberta — quer ser surpreendido |
| **Casal casual** | Acompanha streaming, watchlist grande, pouco uso de Letterboxd | Modo Limpa-Fila — quer decidir entre o que já salvou |
| **Grupo de amigos** | 3+ pessoas, encontros esporádicos | *(pós-MVP — sessões com mais de 2 usuários)* |

## 1.5. Métricas de sucesso (norte para o MVP)

- **Tempo médio até o pódio** < 5 minutos por sessão.
- **Taxa de sessões completadas** (que fecham o pódio de 3) > 60%.
- **Retorno em 7 dias** (D7 retention) de um usuário que completou ao menos uma sessão > 40%.

## 1.6. Por que não X?

- **Por que não só recomendar o "Top 1"?** Porque a graça do produto é a sensação gamificada e a sociabilidade do swipe. Recomendação top-1 é um produto diferente (e existe — Reelgood, JustWatch).
- **Por que não usar tags de gênero?** Dois filmes ambos "Drama" podem ser experiências completamente diferentes. SBERT em sinopses captura nuance (tom, tema, atmosfera).
- **Por que Letterboxd e não IMDB / TMDB direto?** Letterboxd tem o sinal de gosto curado pelo próprio usuário (favoritos pinados, ratings, watchlist). IMDB/TMDB são catálogos, não perfis de gosto.

## 1.7. Próximos passos do produto

Ver [08-roadmap.md](08-roadmap.md) pro escopo detalhado de MVP v1 vs v2+.
