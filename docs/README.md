# Documentação do CineMatch

Toda a documentação do projeto vive aqui. Os arquivos estão numerados pela ordem de leitura recomendada: começa em `01-overview.md` se você é novo no projeto.

| # | Arquivo | Sobre |
|---|---|---|
| 01 | [overview.md](01-overview.md) | Visão geral do produto, modos de jogo, personas |
| 02 | [architecture.md](02-architecture.md) | Decisões de arquitetura, stack, componentes, fluxos |
| 03 | [data-model.md](03-data-model.md) | Entidades, relacionamentos, schema Prisma anotado |
| 04 | [api-contracts.md](04-api-contracts.md) | REST endpoints + eventos WebSocket |
| 05 | [match-algorithm.md](05-match-algorithm.md) | SBERT, embeddings, midpoint vetorial, similaridade cosseno |
| 06 | [letterboxd.md](06-letterboxd.md) | Estratégia de integração com Letterboxd (RSS + scraping) |
| 07 | [gamification.md](07-gamification.md) | Pódio de 3, cooldown de dislike, premium gating |
| 08 | [roadmap.md](08-roadmap.md) | Escopo do MVP v1 vs v2+ |

## Diagramas

Os diagramas Mermaid editáveis ficam em [diagrams/](diagrams/). Os arquivos `.md` acima referenciam os diagramas inline e também linkam o `.mmd` fonte para edição.

## Convenções da documentação

- Idioma da documentação: **português (pt-BR)**. O leitor primário é o dono do projeto.
- Idioma do código e commits: **inglês**. Ver [CLAUDE.md](../CLAUDE.md) raiz.
- Decisões arquiteturais não-óbvias devem incluir um trecho **"Por que não X?"** explicando alternativas descartadas.
- Cada documento começa com um TL;DR de 2-4 linhas pra leitura rápida.
