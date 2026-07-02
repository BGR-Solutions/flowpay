import type { Atendente } from '../../domain/entities/atendente.js';
import type { Atendimento } from '../../domain/entities/atendimento.js';
import type { Mensagem } from '../../domain/entities/mensagem.js';
import type { Time } from '../../domain/entities/time.js';
import type {
  AtendenteRepository,
  AtendimentoRepository,
  MensagemRepository,
  TimeRepository,
} from '../../domain/ports/repositories.js';

/**
 * Implementação in-memory de {@link TimeRepository}.
 *
 * Armazena as entidades por referência: como o domínio muta as próprias
 * instâncias, `salvar` apenas garante o registro no mapa. Serve para
 * desenvolvimento e testes; substituível por Postgres/Redis sem afetar o
 * núcleo.
 */
export class InMemoryTimeRepository implements TimeRepository {
  private readonly dados = new Map<string, Time>();

  /** @inheritDoc */
  async buscarPorId(id: string): Promise<Time | undefined> {
    return this.dados.get(id);
  }

  /** @inheritDoc */
  async buscarPorTipo(tipo: Time['tipo']): Promise<Time | undefined> {
    for (const time of this.dados.values()) {
      if (time.tipo === tipo) return time;
    }
    return undefined;
  }

  /** @inheritDoc */
  async listar(): Promise<Time[]> {
    return [...this.dados.values()];
  }

  /** @inheritDoc */
  async salvar(time: Time): Promise<void> {
    this.dados.set(time.id, time);
  }
}

/**
 * Implementação in-memory de {@link AtendenteRepository}.
 */
export class InMemoryAtendenteRepository implements AtendenteRepository {
  private readonly dados = new Map<string, Atendente>();

  /** @inheritDoc */
  async buscarPorId(id: string): Promise<Atendente | undefined> {
    return this.dados.get(id);
  }

  /** @inheritDoc */
  async listarPorTime(timeId: string): Promise<Atendente[]> {
    return [...this.dados.values()].filter((a) => a.timeId === timeId);
  }

  /** @inheritDoc */
  async listar(): Promise<Atendente[]> {
    return [...this.dados.values()];
  }

  /** @inheritDoc */
  async salvar(atendente: Atendente): Promise<void> {
    this.dados.set(atendente.id, atendente);
  }
}

/**
 * Implementação in-memory de {@link AtendimentoRepository}.
 */
export class InMemoryAtendimentoRepository implements AtendimentoRepository {
  private readonly dados = new Map<string, Atendimento>();

  /** @inheritDoc */
  async buscarPorId(id: string): Promise<Atendimento | undefined> {
    return this.dados.get(id);
  }

  /** @inheritDoc */
  async buscarAtivoPorCliente(clienteId: string): Promise<Atendimento | undefined> {
    for (const atendimento of this.dados.values()) {
      if (
        atendimento.clienteId === clienteId &&
        atendimento.status !== 'FINALIZADO' &&
        atendimento.status !== 'ABANDONADO'
      ) {
        return atendimento;
      }
    }
    return undefined;
  }

  /** @inheritDoc */
  async listar(): Promise<Atendimento[]> {
    return [...this.dados.values()];
  }

  /** @inheritDoc */
  async salvar(atendimento: Atendimento): Promise<void> {
    this.dados.set(atendimento.id, atendimento);
  }
}

/**
 * Implementação in-memory de {@link MensagemRepository}.
 */
export class InMemoryMensagemRepository implements MensagemRepository {
  private readonly dados = new Map<string, Mensagem>();

  /** @inheritDoc */
  async listarPorAtendimento(atendimentoId: string): Promise<Mensagem[]> {
    return [...this.dados.values()]
      .filter((m) => m.atendimentoId === atendimentoId)
      .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  }

  /** @inheritDoc */
  async buscarPorExternalId(externalId: string): Promise<Mensagem | undefined> {
    for (const mensagem of this.dados.values()) {
      if (mensagem.externalId === externalId) return mensagem;
    }
    return undefined;
  }

  /** @inheritDoc */
  async salvar(mensagem: Mensagem): Promise<void> {
    this.dados.set(mensagem.id, mensagem);
  }
}
