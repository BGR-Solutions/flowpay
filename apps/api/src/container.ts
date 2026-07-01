import { MotorDistribuicao } from './domain/distribuicao/motor-distribuicao.js';
import type { ChannelPort } from './domain/ports/channel-port.js';
import { SystemClock } from './domain/ports/clock.js';
import { UuidGenerator } from './domain/ports/id-generator.js';
import { Consultas } from './application/queries/consultas.js';
import { ProcessarMensagemRecebida } from './application/use-cases/processar-mensagem-recebida.js';
import { ResponderMensagem } from './application/use-cases/responder-mensagem.js';
import { WhatsAppMockAdapter } from './infra/channels/whatsapp-mock-adapter.js';
import { InMemoryEventBus } from './infra/event-bus/in-memory-event-bus.js';
import {
  InMemoryAtendenteRepository,
  InMemoryAtendimentoRepository,
  InMemoryMensagemRepository,
  InMemoryTimeRepository,
} from './infra/repositories/in-memory-repositories.js';
import { popularDadosIniciais } from './infra/seed.js';

/**
 * Conjunto de dependências resolvidas da aplicação.
 */
export interface Container {
  /** Motor de distribuição. */
  motor: MotorDistribuicao;
  /** Serviço de consultas de leitura. */
  consultas: Consultas;
  /** Caso de uso de resposta ao cliente. */
  responderMensagem: ResponderMensagem;
  /** Caso de uso de processamento de mensagem recebida. */
  processarMensagemRecebida: ProcessarMensagemRecebida;
  /** Barramento de eventos de domínio. */
  eventos: InMemoryEventBus;
  /** Canal de WhatsApp (mock nesta fase). */
  canal: WhatsAppMockAdapter;
  /** Repositório de times (exposto para leitura direta quando útil). */
  times: InMemoryTimeRepository;
  /** Repositório de atendentes. */
  atendentes: InMemoryAtendenteRepository;
  /** Repositório de atendimentos. */
  atendimentos: InMemoryAtendimentoRepository;
}

/**
 * Composition root: instancia e conecta todas as dependências concretas.
 *
 * Concentrar a fiação num único lugar mantém o restante do código dependente
 * apenas de abstrações, facilitando a troca de implementações (ex.: canal mock
 * -> Cloud API, repos in-memory -> Postgres).
 *
 * @returns O container com as dependências prontas e os dados iniciais
 * semeados.
 */
export async function criarContainer(): Promise<Container> {
  const clock = new SystemClock();
  const ids = new UuidGenerator();
  const eventos = new InMemoryEventBus();

  const times = new InMemoryTimeRepository();
  const atendentes = new InMemoryAtendenteRepository();
  const atendimentos = new InMemoryAtendimentoRepository();
  const mensagens = new InMemoryMensagemRepository();

  await popularDadosIniciais({ times, atendentes, ids });

  const motor = new MotorDistribuicao({ times, atendentes, atendimentos, clock, ids, eventos });
  const consultas = new Consultas({ times, atendentes, atendimentos, mensagens });

  const canal: ChannelPort & WhatsAppMockAdapter = new WhatsAppMockAdapter(ids, clock);

  const responderMensagem = new ResponderMensagem({
    atendimentos,
    mensagens,
    canal,
    eventos,
    clock,
    ids,
  });

  const processarMensagemRecebida = new ProcessarMensagemRecebida({
    motor,
    atendimentos,
    mensagens,
    times,
    canal,
    eventos,
    ids,
  });

  // Conecta a entrada do canal ao caso de uso de processamento.
  canal.onMensagem((mensagem) => processarMensagemRecebida.executar(mensagem).then(() => undefined));

  return {
    motor,
    consultas,
    responderMensagem,
    processarMensagemRecebida,
    eventos,
    canal,
    times,
    atendentes,
    atendimentos,
  };
}
