import type { EventoTempoReal, SnapshotPayload } from '@flowpay/shared';
import type { WebSocket } from '@fastify/websocket';
import type { Consultas } from '../../application/queries/consultas.js';
import type { DomainEventPublisher } from '../../domain/events/domain-events.js';
import { domainEventParaTempoReal } from './event-mapper.js';

/**
 * Gateway WebSocket: mantém as conexões do dashboard e faz *broadcast* dos
 * eventos de domínio em tempo real.
 *
 * Desacopla o transporte (WebSocket) do domínio: assina o barramento de eventos
 * e reenvia cada evento traduzido para os clientes conectados.
 */
export class WsGateway {
  /** Conexões ativas. */
  private readonly clientes = new Set<WebSocket>();

  /**
   * @param consultas - Serviço de consultas (para o snapshot inicial).
   * @param eventos - Publicador de eventos de domínio a assinar.
   */
  constructor(
    private readonly consultas: Consultas,
    eventos: DomainEventPublisher,
  ) {
    eventos.assinar((evento) => {
      this.transmitir(domainEventParaTempoReal(evento));
    });
  }

  /**
   * Registra uma nova conexão e envia o snapshot inicial do sistema.
   *
   * @param socket - Conexão WebSocket recém-aberta.
   */
  async registrar(socket: WebSocket): Promise<void> {
    this.clientes.add(socket);
    socket.on('close', () => this.clientes.delete(socket));
    socket.on('error', () => this.clientes.delete(socket));

    const snapshot = await this.consultas.snapshot();
    this.enviar(socket, {
      tipo: 'SNAPSHOT',
      payload: snapshot satisfies SnapshotPayload,
      emitidoEm: new Date().toISOString(),
    });
  }

  /**
   * @returns Quantidade de conexões ativas.
   */
  get totalConexoes(): number {
    return this.clientes.size;
  }

  /**
   * Envia um evento para todas as conexões ativas.
   *
   * @param evento - Evento de tempo real a transmitir.
   */
  private transmitir(evento: EventoTempoReal): void {
    for (const cliente of this.clientes) {
      this.enviar(cliente, evento);
    }
  }

  /**
   * Serializa e envia um evento para uma conexão específica.
   *
   * @param socket - Conexão destino.
   * @param evento - Evento a enviar.
   */
  private enviar(socket: WebSocket, evento: EventoTempoReal): void {
    if (socket.readyState !== socket.OPEN) return;
    socket.send(JSON.stringify(evento));
  }
}
