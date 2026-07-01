# Fases de Implementação

A solução foi construída em fases incrementais, cada uma entregando uma camada testável.

## Fase 0 — Fundação do monorepo
- Workspaces npm: `packages/shared`, `apps/api`, `apps/web`.
- Tooling: TypeScript (strict), ESLint, Prettier, Vitest.
- Contratos compartilhados (`@flowpay/shared`): enums, DTOs e eventos de tempo real.

## Fase 1 — Domínio + motor de distribuição
- Entidades: `Atendente`, `Time`, `Atendimento`, `Mensagem` (com invariantes).
- Motor de distribuição: roteamento por assunto, alocação *least-loaded*, fila FIFO, despacho ao finalizar.
- Concorrência: mutex por time garantindo o limite de 3 atendimentos por atendente.
- Testes unitários cobrindo roteamento, fila, capacidade, concorrência e idempotência.

## Fase 2 — API REST + tempo real
- Casos de uso e consultas (CQRS-lite) sobre repositórios in-memory (via portas).
- Fastify com validação (zod), tratamento de erros e OpenAPI/Swagger em `/docs`.
- Event bus + gateway WebSocket com snapshot inicial e eventos incrementais.
- Testes de integração da API (via `app.inject`).

## Fase 3 — Canal WhatsApp plugável
- `ChannelPort` (porta) + `WhatsAppMockAdapter` (implementação de demonstração).
- Caso de uso de mensagem recebida: idempotência por `externalId`, classificação de assunto, avisos automáticos de fila/alocação.
- Endpoint `POST /simular/whatsapp/mensagem` para exercitar o fluxo ponta a ponta.

## Fase 4 — Dashboard React + Storybook
- Store em tempo real (Zustand) alimentada pelo WebSocket; métricas derivadas por seletores.
- Componentes: KPIs, cartões por time (ocupação, carga por atendente, fila), gráfico de evolução.
- Storybook documentando os componentes isoladamente.

## Fase 5 — Empacotamento e operação
- Dockerfiles (API e Web) + `docker-compose.yml` (web via nginx com proxy para a API).
- Pipeline de CI (lint, typecheck, testes, build).
- Documentação (README, design, fases).

## Evolução futura (não implementado)
- Persistência real (PostgreSQL/Prisma) e estado quente em Redis para escala horizontal.
- Adaptador WhatsApp Cloud API real (webhook + assinatura, janela de 24h, templates HSM).
- Classificação de assunto por NLP.
