# FlowPay — Distribuição e Monitoramento de Atendimentos
## Documento de Design Técnico (Back-end Node.js + Front-end React)

> Escopo desta versão: **design completo**, com o WhatsApp modelado como um **adaptador de canal plugável** (interface abstrata + mock), sem depender da Meta agora. Para cada decisão há a **justificativa** de por que é a melhor forma de implementar.

---

## 1. Visão geral da arquitetura

```
┌───────────────────────────────────────────────────────────────┐
│  FRONT-END — Dashboard (React + TypeScript)                    │
│  KPIs · filas por time · carga por atendente · tempo real      │
└───────────────┬───────────────────────────────────────────────┘
                │ REST (comandos/consultas) + WebSocket (push)
┌───────────────┴───────────────────────────────────────────────┐
│  BACK-END (Node.js + TypeScript)                               │
│                                                                │
│  Interface (HTTP/WS)                                           │
│    ├─ REST Controllers        └─ WS Gateway (broadcast)        │
│  Application (Casos de uso)                                    │
│    ├─ CriarAtendimento  ├─ FinalizarAtendimento               │
│    ├─ ResponderMensagem ├─ ConsultarDashboard                 │
│  Domain (núcleo puro, sem framework)  ◄── coração do desafio   │
│    ├─ Motor de Distribuição (fila + capacidade=3)             │
│    ├─ Entidades: Time, Atendente, Atendimento, Mensagem       │
│    └─ Regras/invariantes                                       │
│  Infra (adaptadores)                                           │
│    ├─ Repositórios (in-memory | Postgres)                     │
│    ├─ Event Bus (broadcast p/ WS)                            │
│    └─ CANAIS: ChannelPort  ──► WhatsAppMockAdapter            │
│                             └► WhatsAppCloudAdapter (futuro)  │
└───────────────────────────────────────────────────────────────┘
```

### 1.1 Estilo arquitetural: Clean Architecture / Ports & Adapters (Hexagonal)

**Decisão:** isolar o *Domain* (motor de distribuição + entidades) de qualquer framework, banco ou canal. Frameworks (Express/Fastify), banco (Postgres) e canais (WhatsApp) são **detalhes plugáveis** nas bordas.

**Justificativa:**
- O que prova senioridade neste desafio é o **algoritmo de distribuição** (capacidade, fila, concorrência). Mantê-lo puro (sem `req`/`res`, sem SQL) o torna **100% testável por unidade**, sem subir servidor nem banco.
- O requisito de WhatsApp pede explicitamente **pluggability**: com uma *porta* `ChannelPort`, trocar mock → Cloud API é adicionar uma classe, sem tocar no núcleo. Isso é o **Dependency Inversion Principle** aplicado ao problema real.
- Reduz o risco de "vazamento" de regra de negócio para dentro de controllers — um erro comum que dificulta testes e manutenção.

**Alternativa descartada:** MVC "gordo" (regra dentro do controller). Mais rápido de escrever no dia 1, mas acopla distribuição ao HTTP e ao WhatsApp, inviabilizando testes isolados e a troca de canal — exatamente o que o desafio valoriza.

---

## 2. Modelo de domínio

### 2.1 Entidades e invariantes

```ts
type TipoTime = 'CARTOES' | 'EMPRESTIMOS' | 'OUTROS';
type Assunto  = 'PROBLEMA_CARTAO' | 'CONTRATACAO_EMPRESTIMO' | 'OUTRO';
type StatusAtendimento = 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'FINALIZADO';

interface Atendente {
  id: string;
  nome: string;
  timeId: string;
  capacidadeMax: number;      // = 3 (regra do desafio)
  atendimentosAtivos: string[]; // ids; invariante: length <= capacidadeMax
}

interface Time {
  id: string;
  tipo: TipoTime;
  atendentesIds: string[];
  fila: string[];             // ids de Atendimento AGUARDANDO (FIFO)
}

interface Atendimento {
  id: string;
  clienteId: string;          // ex.: wa_id (telefone) ou id interno
  canal: 'WHATSAPP' | 'API';  // origem
  assunto: Assunto;
  status: StatusAtendimento;
  timeId: string;
  atendenteId?: string;
  criadoEm: Date;
  iniciadoEm?: Date;          // p/ tempo de espera
  finalizadoEm?: Date;        // p/ tempo de atendimento
}

interface Mensagem {
  id: string;
  atendimentoId: string;
  direcao: 'IN' | 'OUT';
  texto: string;
  externalId?: string;        // waMessageId (idempotência)
  criadoEm: Date;
}
```

**Invariantes de negócio (garantidas no Domain):**
1. `atendente.atendimentosAtivos.length <= 3` — **sempre**.
2. Um `Atendimento` só está `EM_ATENDIMENTO` se tiver `atendenteId`.
3. Ordem da `fila` é FIFO (justiça de atendimento).
4. Cada telefone (`clienteId`) tem **no máximo 1** atendimento ativo por vez (evita duplicidade quando o cliente manda várias mensagens).

**Justificativa do modelo:** modelar `fila` **dentro do Time** (e não numa tabela global) torna a regra "distribua ao liberar vaga *naquele time*" local e trivial de raciocinar. Guardar `criadoEm/iniciadoEm/finalizadoEm` no próprio atendimento dá, de graça, as métricas que o Dashboard precisa (tempo de espera e de atendimento) sem tabela extra.

### 2.2 Roteamento por assunto

```ts
function resolverTime(assunto: Assunto): TipoTime {
  switch (assunto) {
    case 'PROBLEMA_CARTAO':        return 'CARTOES';
    case 'CONTRATACAO_EMPRESTIMO': return 'EMPRESTIMOS';
    default:                       return 'OUTROS'; // fallback obrigatório
  }
}
```

**Justificativa:** `OUTROS` como *default* garante que nenhuma solicitação fique órfã (requisito: "demais assuntos"). Mapa explícito (não string mágica espalhada) centraliza a regra num único ponto de mudança.

---

## 3. Motor de Distribuição (o núcleo)

### 3.1 Algoritmo

**Ao criar atendimento:**
```
1. assunto → time (resolverTime)
2. procurar atendente do time com vaga (atendimentosAtivos < 3)
   - critério: menor carga atual (balanceamento) — ver 3.3
3. se achou → alocar (status EM_ATENDIMENTO, iniciadoEm=now)
   se não achou → enfileirar (status AGUARDANDO, entra no fim da fila FIFO)
4. emitir evento de mudança de estado (p/ WebSocket + canal)
```

**Ao finalizar atendimento:**
```
1. liberar vaga do atendente (remover de atendimentosAtivos)
2. se a fila do time não está vazia → desenfileirar o 1º (FIFO)
   e alocar nesse mesmo atendente
3. emitir eventos
```

### 3.2 Concorrência e atomicidade — ponto crítico

**Problema:** "finalizar atendimento A" e "criar atendimento B" podem ocorrer quase simultâneos e disputar a **mesma vaga**, violando o limite de 3 (condição de corrida).

**Decisão:** serializar todas as **operações de mutação do estado de um time** através de uma **fila de comandos sequencial por time** (um *actor*/mutex lógico por `timeId`).

**Justificativa:**
- Node.js é single-threaded no JS, mas os casos de uso são **assíncronos** (I/O de banco/canal): entre um `await` e outro, outro comando pode intercalar e ver estado obsoleto. Um `await repo.save()` no meio da alocação é suficiente para introduzir corrida. Portanto, **precisamos de exclusão mútua lógica**, mesmo em Node.
- Serializar **por time** (e não global) preserva paralelismo entre times diferentes — throughput maior, sem sacrificar correção.
- Um "actor por time" é mais simples de raciocinar e testar que locks distribuídos; e evolui naturalmente para Redis/lock distribuído se escalar horizontalmente.

**Implementação sugerida:** cada time tem uma *promise chain* (`queue = queue.then(op)`) ou uma lib de mutex (`async-mutex`). Se um dia rodar em múltiplas instâncias, trocar por lock Redis (`Redlock`) — a *porta* já isola isso.

### 3.3 Estratégia de escolha do atendente

**Decisão:** *least-loaded* (menor número de atendimentos ativos), com desempate estável (ordem de cadastro).

**Justificativa:** distribui carga de forma equilibrada (melhor experiência e métricas mais justas no Dashboard) e é determinística — facilita testes. Alternativas (round-robin, aleatório) são válidas, mas *least-loaded* aproveita melhor a capacidade e evita atendente "quente".

### 3.4 Por que testar isso exaustivamente

Casos de teste unitário do motor (sem HTTP/DB):
- aloca quando há vaga; enfileira quando lotado;
- ao finalizar, puxa o próximo da fila (FIFO respeitado);
- roteamento correto por assunto, incl. fallback `OUTROS`;
- limite de 3 nunca é ultrapassado sob N criações concorrentes;
- cliente com atendimento ativo não gera duplicado.

**Justificativa:** é a parte de maior risco e maior valor demonstrável; testes de unidade rápidos aqui valem mais que testes E2E lentos.

---

## 4. Camada de Canais (WhatsApp plugável)

### 4.1 A porta (interface) — o contrato do canal

```ts
// Domain/ports — o núcleo depende só disto, nunca da Meta
export interface MensagemRecebida {
  externalId: string;      // waMessageId
  clienteId: string;       // wa_id (telefone) ou id do canal
  texto: string;
  recebidoEm: Date;
}

export interface ChannelPort {
  readonly nome: 'WHATSAPP' | 'API' | 'MOCK';
  // enviar mensagem ao cliente (resposta do atendente, avisos de fila etc.)
  enviarMensagem(clienteId: string, texto: string): Promise<{ externalId: string }>;
  // registrar callback de entrada (o adaptador chama quando chega msg)
  onMensagem(handler: (m: MensagemRecebida) => Promise<void>): void;
}
```

**Justificativa:**
- O núcleo só conhece `ChannelPort`. Trocar mock ↔ Cloud API é **injeção de dependência** — zero mudança no motor/casos de uso. Isso concretiza o "plugável" pedido.
- `externalId` no contrato habilita **idempotência** (webhooks do WhatsApp podem repetir) desde o design.
- `onMensagem` inverte o controle: o adaptador empurra eventos; o núcleo não faz *polling* nem conhece webhook/HTTP.

### 4.2 O mock (para desenvolver/testar sem a Meta)

```ts
export class WhatsAppMockAdapter implements ChannelPort {
  readonly nome = 'MOCK';
  private handler?: (m: MensagemRecebida) => Promise<void>;
  public enviadas: { clienteId: string; texto: string }[] = []; // p/ asserts/dashboard

  onMensagem(h) { this.handler = h; }

  async enviarMensagem(clienteId, texto) {
    this.enviadas.push({ clienteId, texto });   // "envia" guardando em memória
    return { externalId: `mock-${Date.now()}` };
  }

  // usado por um endpoint de simulação e pela UI de teste
  async simularEntrada(clienteId: string, texto: string) {
    await this.handler?.({
      externalId: `in-${Date.now()}`, clienteId, texto, recebidoEm: new Date(),
    });
  }
}
```

Endpoint de simulação (só em dev): `POST /simular/whatsapp/mensagem { clienteId, texto }` → chama `simularEntrada`.

**Justificativa:**
- Permite **demonstrar o fluxo ponta a ponta** (mensagem entra → roteia → aloca/enfileira → resposta "sai") sem número verificado nem espera de aprovação da Meta.
- `enviadas` funciona como *spy* — os testes verificam que o cliente recebeu "você está na fila, posição X" ou a resposta do atendente.
- Um **simulador** de mensagens deixa o Dashboard "vivo" na demo (gera carga realista).

### 4.3 O adaptador real (futuro, sem mudar o núcleo)

```ts
export class WhatsAppCloudAdapter implements ChannelPort {
  readonly nome = 'WHATSAPP';
  // POST https://graph.facebook.com/vX/{phoneId}/messages  (Bearer token)
  async enviarMensagem(clienteId, texto) { /* chama Graph API */ }
  // recebe do webhook /webhooks/whatsapp e chama this.handler
}
```

Considerações reais já previstas no design (mesmo sem implementar agora):
- **Verificação de webhook** (`GET` challenge) e **validação de assinatura** `X-Hub-Signature-256`.
- **Janela de 24h** e **templates HSM** para mensagens proativas fora da janela.
- **Idempotência** por `waMessageId`.
- **LGPD**: telefone é dado pessoal → criptografia em repouso, retenção e consentimento.

**Justificativa:** ao explicitar essas restrições no contrato/design agora, a migração para produção não vira retrabalho — o mock e o real compartilham a **mesma porta**.

### 4.4 Classificação de assunto a partir do texto

**Decisão (fase 1):** **menu interativo** — a primeira interação oferece "1) Problema com cartão · 2) Empréstimo · 3) Outros"; a escolha define o `Assunto`.

**Justificativa:** determinístico, sem ambiguidade, fácil de testar e de demonstrar. NLP/classificador de texto é um **diferencial opcional** (fase 2), mas introduz erro de classificação e complexidade — não é o foco do desafio. Como a classificação também é uma responsabilidade isolável (`AssuntoClassifier`), dá pra trocar menu → NLP depois sem tocar no motor.

---

## 5. Back-end: stack e decisões (Node.js + TypeScript)

| Item | Escolha | Justificativa |
|---|---|---|
| Linguagem | **TypeScript** | Tipagem estática pega erros de contrato (estados, DTOs) em tempo de compilação; essencial num domínio com invariantes. |
| Framework HTTP | **Fastify** (ou Express) | Fastify: rápido, schema/validação nativa, ótimo p/ WebSocket. Express serve igual se preferir familiaridade. |
| Tempo real | **WebSocket** (`ws`/`socket.io`) | Dashboard precisa de *push*; WS é bidirecional e eficiente. (SSE seria alternativa mais simples se só precisasse server→client.) |
| Validação | **Zod** | Valida entrada de API/webhook e deriva tipos — uma fonte de verdade. |
| Persistência (fase 1) | **In-memory (repos)** | Foco no algoritmo; sobe sem infra. Portas de repositório permitem trocar por Postgres sem tocar no núcleo. |
| Persistência (fase 2) | **PostgreSQL + Prisma** | Durabilidade e histórico p/ métricas; Prisma dá tipos e migrations. |
| Concorrência | **async-mutex por time** | Correção sob concorrência (seção 3.2). |
| Testes | **Vitest/Jest** + **Supertest** | Unidade no domínio, integração na API. |
| Docs | **OpenAPI/Swagger** | Contrato explícito da REST. |
| Container | **Docker Compose** | `up` sobe back + front (+ db na fase 2) num comando. |

**Justificativa da stack Node:** casa com o front React (mesma linguagem/DTOs compartilháveis), tem excelente suporte a WebSocket (tempo real do Dashboard) e ecossistema maduro. O ponto de atenção (concorrência) é resolvido pelo mutex por time — coberto no design.

### 5.1 Contratos da API REST

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/atendimentos` | Cria solicitação `{ clienteId, assunto, canal }` → aloca ou enfileira |
| `GET` | `/atendimentos` | Lista (filtros: status, timeId) |
| `GET` | `/atendimentos/:id` | Detalhe + mensagens |
| `PATCH` | `/atendimentos/:id/finalizar` | Libera vaga e puxa próximo da fila |
| `POST` | `/atendimentos/:id/mensagens` | Atendente responde → envia via ChannelPort |
| `GET` | `/times` | Estado dos times (atendentes, ocupação, tamanho da fila) |
| `GET` | `/atendentes` | Lista + carga atual (0–3) |
| `GET` | `/dashboard/metricas` | KPIs agregados |
| `POST` | `/webhooks/whatsapp` | (fase real) entrada de mensagens |
| `GET` | `/webhooks/whatsapp` | (fase real) verificação do webhook |
| `POST` | `/simular/whatsapp/mensagem` | (dev/mock) injeta mensagem de entrada |
| `WS` | `/ws` | Push de eventos p/ o Dashboard |

**Justificativa REST:** o desafio pede REST; recursos (`/atendimentos`, `/times`, `/atendentes`) + verbos HTTP são intuitivos e documentáveis via OpenAPI. O tempo real fica no WS separado — REST para comandos/consultas, WS para *push* (cada um no que é melhor).

### 5.2 Eventos de domínio → WebSocket

Eventos emitidos pelo motor: `ATENDIMENTO_CRIADO`, `ATENDIMENTO_ALOCADO`, `ATENDIMENTO_ENFILEIRADO`, `ATENDIMENTO_FINALIZADO`, `MENSAGEM_RECEBIDA`, `MENSAGEM_ENVIADA`.

Um **Event Bus** interno publica; o **WS Gateway** faz *broadcast* p/ os dashboards conectados.

**Justificativa:** desacopla o núcleo do transporte (o motor não conhece WebSocket). O mesmo evento poderia alimentar métricas, logs ou o canal WhatsApp (ex.: "chegou sua vez") — extensível sem alterar o motor.

---

## 6. Front-end: Dashboard (React + TypeScript)

| Item | Escolha | Justificativa |
|---|---|---|
| Base | **React + Vite + TS** | Vite: build/dev rápido; TS compartilha tipos de DTO com o back. |
| Dados servidor | **TanStack Query** | Cache, revalidação e estados de loading/erro prontos p/ os `GET`. |
| Tempo real | **hook WebSocket** | Atualiza o cache do Query ao receber eventos → UI reativa sem *refetch* pesado. |
| Estado UI | **Zustand** (leve) | Estado local simples (filtros, seleção) sem boilerplate. |
| Estilo | **TailwindCSS** (+ shadcn/ui) | Prototipagem rápida e consistente de cards/tabelas/gráficos. |
| Gráficos | **Recharts** | Throughput e tempos ao longo do tempo. |

**Componentes do Dashboard:**
- **Cards por time**: atendentes livres/ocupados, % ocupação, **tamanho da fila**, tempo médio de espera.
- **Grade de atendentes**: barra de carga 0–3 por atendente.
- **Fila por time**: lista FIFO com tempo de espera de cada item.
- **KPIs globais**: em atendimento, aguardando, finalizados (período), tempo médio de atendimento.
- **Gráfico temporal**: throughput / entradas x finalizações.
- **Painel de conversa (opcional)**: mensagens IN/OUT de um atendimento, com campo p/ atendente responder (usa `POST /atendimentos/:id/mensagens`).

**Justificativa das escolhas:**
- **TanStack Query + WS**: o desafio pede **tempo real**. Fazer *polling* puro seria simples porém ineficiente e com atraso; combinar snapshot inicial (REST) + updates incrementais (WS) dá dados frescos com baixo custo — e o Query já gerencia cache/erros.
- **Tipos compartilhados** entre back e front (monorepo ou pacote `shared`) elimina divergência de contrato — um ganho direto de usar TS nas duas pontas.

---

## 7. Persistência: por que começar in-memory

**Decisão:** repositórios in-memory na fase 1, atrás de interfaces (`AtendimentoRepo`, `TimeRepo`...); Postgres+Prisma na fase 2.

**Justificativa:**
- Fase 1 foca no **algoritmo** (o que o desafio avalia), sobe sem infra e roda testes rápido.
- As **portas de repositório** garantem que introduzir Postgres não toque no núcleo — só troca a implementação injetada.
- Postgres entra quando o valor for **histórico/métricas persistentes** e durabilidade — aí o Dashboard mostra dados que sobrevivem a reinício.

**Nota de escala:** com múltiplas instâncias, o estado "quente" (filas/ocupação) migraria p/ **Redis** (+ lock distribuído), mantendo Postgres p/ histórico. O design de portas já suporta isso.

---

## 8. Qualidade, observabilidade e entrega

- **Testes**: unidade no domínio (motor/roteamento/concorrência), integração na API (Supertest), e testes do adaptador mock (envio/idempotência).
- **OpenAPI/Swagger** publicado.
- **Docker Compose** sobe tudo com um comando; **seed** cria times/atendentes; **simulador** gera atendimentos p/ demo.
- **Logs estruturados** (pino) + **health check** (`/health`).
- **README** com arquitetura, decisões e como rodar.

**Justificativa:** demonstra maturidade de engenharia (não só "funciona"): reprodutibilidade (Docker), contrato (OpenAPI), confiabilidade (testes) e operação (logs/health) — o pacote esperado num desafio sênior.

---

## 9. Resumo das decisões e trade-offs

| Decisão | Alternativa | Por que a escolhida vence aqui |
|---|---|---|
| Clean/Hexagonal | MVC gordo | Testabilidade do núcleo + WhatsApp plugável (requisito) |
| Fila FIFO por time | Fila global | Regra "libera vaga no time" fica local e simples |
| Mutex por time | Sem lock / lock global | Correção sob concorrência sem matar paralelismo |
| Least-loaded | Round-robin/aleatório | Balanceia carga; determinístico p/ testes |
| Menu de assunto | NLP | Determinístico e sem erro de classificação (NLP = fase 2) |
| ChannelPort + mock | Integrar Meta já | Demonstra ponta a ponta sem número verificado; real é só nova impl |
| In-memory → Postgres | Postgres desde já | Foco no algoritmo primeiro; portas permitem evoluir sem retrabalho |
| REST + WebSocket | Só REST + polling | Tempo real eficiente (requisito do Dashboard) |
| Node+TS nas 2 pontas | Stacks diferentes | Tipos/DTOs compartilhados, menos divergência de contrato |

---

## 10. Fases de implementação sugeridas

1. **Domínio + motor** (entidades, roteamento, fila, mutex) + testes de unidade.
2. **API REST + Event Bus + WebSocket** + repos in-memory + OpenAPI.
3. **ChannelPort + WhatsAppMockAdapter** + endpoint de simulação + avisos de fila.
4. **Dashboard React** (cards, filas, KPIs, gráfico) consumindo REST + WS.
5. **Docker Compose + seed + simulador** (demo "viva").
6. **(Opcional/fase 2)** Postgres+Prisma, WhatsApp Cloud real, classificador NLP.
