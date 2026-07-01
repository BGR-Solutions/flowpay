# FlowPay · Distribuição e Monitoramento de Atendimentos

Software de **distribuição de atendimentos** e **dashboard de acompanhamento em tempo real** para a central de relacionamento da FlowPay.

- **Back-end**: Node.js + TypeScript (Fastify), API REST + WebSocket, arquitetura hexagonal.
- **Front-end**: React + TypeScript (Vite), dashboard em tempo real, componentes documentados no Storybook.
- **Canal WhatsApp**: modelado como adaptador **plugável** (`ChannelPort`), com implementação mock para demonstração sem depender da Meta.

## Índice

- [Arquitetura](#arquitetura)
- [Regras de negócio](#regras-de-negócio)
- [Estrutura do monorepo](#estrutura-do-monorepo)
- [Como rodar](#como-rodar)
- [API REST](#api-rest)
- [Tempo real (WebSocket)](#tempo-real-websocket)
- [Testes, lint e typecheck](#testes-lint-e-typecheck)
- [Storybook](#storybook)
- [Fases de implementação](#fases-de-implementação)

## Arquitetura

O back-end segue **Clean Architecture / Ports & Adapters**, isolando o núcleo (motor de distribuição) de frameworks, banco e canais:

```
Interface (HTTP/WS)  ->  Application (casos de uso, consultas)
        |                          |
        v                          v
     Domain (motor de distribuição, entidades, portas)
        ^
        |
     Infra (repos in-memory, event bus, canal WhatsApp mock)
```

Decisões-chave e justificativas estão em [`docs/design.md`](docs/design.md).

### Motor de distribuição

O núcleo (`apps/api/src/domain/distribuicao/motor-distribuicao.ts`):

1. Roteia por assunto (`Problemas com cartão` → Cartões, `Contratação de empréstimo` → Empréstimos, demais → Outros).
2. Aloca ao atendente de menor carga (*least-loaded*) ou **enfileira (FIFO)** quando o time está lotado.
3. Ao finalizar um atendimento, libera a vaga e **puxa o próximo da fila**.

**Concorrência**: cada seção crítica de um time é serializada por um **mutex por time** (`async-mutex`), garantindo a invariante "no máximo 3 atendimentos simultâneos por atendente" mesmo sob requisições concorrentes, sem sacrificar paralelismo entre times distintos.

## Regras de negócio

- 3 times: **Cartões**, **Empréstimos**, **Outros Assuntos**.
- Cada atendente atende **no máximo 3** pessoas simultaneamente.
- Time lotado → atendimentos vão para uma **fila FIFO** e são distribuídos assim que uma vaga abre.

## Estrutura do monorepo

```
flowpay/
├─ packages/shared/     # Contratos (DTOs, enums, eventos) compartilhados
├─ apps/api/            # Back-end (domínio, aplicação, infra, HTTP/WS)
├─ apps/web/            # Front-end (dashboard React + Storybook)
├─ docker-compose.yml   # Sobe API + Web
└─ docs/                # Design e fases de implementação
```

## Como rodar

Requisitos: **Node.js 20+**.

### Desenvolvimento (local)

```bash
npm install
npm run build --workspace @flowpay/shared   # gera os tipos compartilhados

# Terminal 1 — API (com simulador de tráfego opcional)
SIMULADOR=true npm run dev:api               # http://localhost:3333  (docs em /docs)

# Terminal 2 — Dashboard
npm run dev:web                              # http://localhost:5173
```

O Vite faz proxy de `/api` e `/ws` para a API, então o dashboard funciona sem configuração extra.

### Docker Compose

```bash
docker compose up --build
# Dashboard: http://localhost:8080
# API:       http://localhost:3333  (Swagger UI em /docs)
```

O `SIMULADOR=true` já vem habilitado no compose para popular o dashboard automaticamente.

## API REST

Documentação interativa (OpenAPI/Swagger) em **`/docs`**.

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/atendimentos` | Cria e distribui uma solicitação |
| `GET` | `/atendimentos` | Lista atendimentos (filtros `status`, `timeId`) |
| `GET` | `/atendimentos/:id` | Detalhe + mensagens |
| `PATCH` | `/atendimentos/:id/finalizar` | Finaliza e libera a vaga |
| `POST` | `/atendimentos/:id/mensagens` | Atendente responde ao cliente |
| `GET` | `/times` | Times com atendentes e filas |
| `GET` | `/atendentes` | Atendentes e carga atual |
| `GET` | `/dashboard/metricas` | Métricas agregadas |
| `POST` | `/simular/whatsapp/mensagem` | Simula mensagem recebida (canal mock) |
| `GET` | `/health` | Health check |

Exemplo:

```bash
curl -X POST localhost:3333/atendimentos \
  -H 'content-type: application/json' \
  -d '{"clienteId":"cliente-1","assunto":"PROBLEMA_CARTAO"}'
```

## Tempo real (WebSocket)

Conecte-se a `ws://localhost:3333/ws`. Ao conectar, o servidor envia um evento `SNAPSHOT` com o estado completo; em seguida, propaga eventos incrementais (`ATENDIMENTO_CRIADO`, `ATENDIMENTO_ALOCADO`, `ATENDIMENTO_ENFILEIRADO`, `ATENDIMENTO_FINALIZADO`, `MENSAGEM_*`).

## Testes, lint e typecheck

```bash
npm run test        # todos os workspaces
npm run lint
npm run typecheck
```

O back-end cobre o motor de distribuição (roteamento, fila FIFO, limite de 3, concorrência), os casos de uso e a API HTTP.

## Storybook

Os componentes do dashboard são documentados isoladamente:

```bash
npm run storybook --workspace @flowpay/web   # http://localhost:6006
```

## Fases de implementação

O projeto foi construído em fases incrementais — veja [`docs/fases.md`](docs/fases.md).

## Licença

[MIT](LICENSE).
