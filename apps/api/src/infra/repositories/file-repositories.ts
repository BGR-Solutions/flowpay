import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Atendente, type AtendenteSnapshot } from '../../domain/entities/atendente.js';
import { Atendimento, type AtendimentoSnapshot } from '../../domain/entities/atendimento.js';
import { Mensagem, type MensagemSnapshot } from '../../domain/entities/mensagem.js';
import { Time, type TimeSnapshot } from '../../domain/entities/time.js';
import type {
  AtendenteRepository,
  AtendimentoRepository,
  MensagemRepository,
  TimeRepository,
} from '../../domain/ports/repositories.js';

/**
 * Lê uma coleção serializada de um arquivo JSON.
 *
 * @typeParam S - Tipo do snapshot armazenado.
 * @param arquivo - Caminho do arquivo.
 * @returns Os snapshots lidos, ou lista vazia se o arquivo não existe.
 */
async function lerColecao<S>(arquivo: string): Promise<S[]> {
  try {
    const conteudo = await readFile(arquivo, 'utf8');
    return JSON.parse(conteudo) as S[];
  } catch {
    return [];
  }
}

/**
 * Escreve uma coleção em disco de forma atômica (grava em arquivo temporário e
 * renomeia), evitando arquivos corrompidos em caso de falha no meio da escrita.
 *
 * @param arquivo - Caminho de destino.
 * @param dados - Snapshots a persistir.
 */
async function escreverColecao(arquivo: string, dados: unknown[]): Promise<void> {
  const temporario = `${arquivo}.tmp`;
  await writeFile(temporario, JSON.stringify(dados, null, 2), 'utf8');
  await rename(temporario, arquivo);
}

/**
 * Serializa as escritas de uma coleção numa cadeia de promessas, garantindo que
 * gravações concorrentes não se sobreponham (última gravação reflete o estado
 * mais recente do mapa).
 *
 * @typeParam S - Tipo do snapshot.
 */
class Persistidor<S> {
  private fila: Promise<void> = Promise.resolve();

  /**
   * @param arquivo - Arquivo de destino.
   * @param instantaneo - Função que produz o snapshot atual da coleção.
   */
  constructor(
    private readonly arquivo: string,
    private readonly instantaneo: () => S[],
  ) {}

  /**
   * Agenda uma gravação do estado atual.
   *
   * @returns Promessa resolvida quando esta gravação conclui.
   */
  agendar(): Promise<void> {
    this.fila = this.fila.then(() => escreverColecao(this.arquivo, this.instantaneo()));
    return this.fila;
  }
}

/**
 * Implementação de {@link TimeRepository} com persistência em arquivo JSON.
 */
class FileTimeRepository implements TimeRepository {
  private readonly persistidor: Persistidor<TimeSnapshot>;

  /**
   * @param arquivo - Arquivo de persistência.
   * @param dados - Mapa inicial (reidratado do disco).
   */
  constructor(
    arquivo: string,
    private readonly dados: Map<string, Time>,
  ) {
    this.persistidor = new Persistidor(arquivo, () =>
      [...this.dados.values()].map((t) => t.paraSnapshot()),
    );
  }

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
    await this.persistidor.agendar();
  }
}

/**
 * Implementação de {@link AtendenteRepository} com persistência em arquivo JSON.
 */
class FileAtendenteRepository implements AtendenteRepository {
  private readonly persistidor: Persistidor<AtendenteSnapshot>;

  /**
   * @param arquivo - Arquivo de persistência.
   * @param dados - Mapa inicial (reidratado do disco).
   */
  constructor(
    arquivo: string,
    private readonly dados: Map<string, Atendente>,
  ) {
    this.persistidor = new Persistidor(arquivo, () =>
      [...this.dados.values()].map((a) => a.paraSnapshot()),
    );
  }

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
    await this.persistidor.agendar();
  }
}

/**
 * Implementação de {@link AtendimentoRepository} com persistência em arquivo
 * JSON.
 */
class FileAtendimentoRepository implements AtendimentoRepository {
  private readonly persistidor: Persistidor<AtendimentoSnapshot>;

  /**
   * @param arquivo - Arquivo de persistência.
   * @param dados - Mapa inicial (reidratado do disco).
   */
  constructor(
    arquivo: string,
    private readonly dados: Map<string, Atendimento>,
  ) {
    this.persistidor = new Persistidor(arquivo, () =>
      [...this.dados.values()].map((a) => a.paraSnapshot()),
    );
  }

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
    await this.persistidor.agendar();
  }
}

/**
 * Implementação de {@link MensagemRepository} com persistência em arquivo JSON.
 */
class FileMensagemRepository implements MensagemRepository {
  private readonly persistidor: Persistidor<MensagemSnapshot>;

  /**
   * @param arquivo - Arquivo de persistência.
   * @param dados - Mapa inicial (reidratado do disco).
   */
  constructor(
    arquivo: string,
    private readonly dados: Map<string, Mensagem>,
  ) {
    this.persistidor = new Persistidor(arquivo, () =>
      [...this.dados.values()].map((m) => m.paraSnapshot()),
    );
  }

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
    await this.persistidor.agendar();
  }
}

/**
 * Conjunto de repositórios persistidos em arquivo.
 */
export interface FileRepositories {
  /** Repositório de times. */
  times: TimeRepository;
  /** Repositório de atendentes. */
  atendentes: AtendenteRepository;
  /** Repositório de atendimentos. */
  atendimentos: AtendimentoRepository;
  /** Repositório de mensagens. */
  mensagens: MensagemRepository;
  /** `true` se havia estado persistido a ser reidratado (dispensa seed). */
  possuiEstado: boolean;
}

/**
 * Cria os repositórios com persistência em arquivo JSON, reidratando o estado
 * previamente salvo no diretório informado.
 *
 * Demonstra concretamente a plugabilidade da porta de persistência: o núcleo
 * (motor, casos de uso) permanece inalterado ao trocar in-memory por arquivo —
 * e a mesma interface admitiria Postgres/Redis.
 *
 * @param dir - Diretório onde os arquivos são mantidos.
 * @returns Os repositórios prontos e a indicação de estado preexistente.
 */
export async function criarFileRepositories(dir: string): Promise<FileRepositories> {
  await mkdir(dir, { recursive: true });

  const arquivoTimes = path.join(dir, 'times.json');
  const arquivoAtendentes = path.join(dir, 'atendentes.json');
  const arquivoAtendimentos = path.join(dir, 'atendimentos.json');
  const arquivoMensagens = path.join(dir, 'mensagens.json');

  const [timesSnap, atendentesSnap, atendimentosSnap, mensagensSnap] = await Promise.all([
    lerColecao<TimeSnapshot>(arquivoTimes),
    lerColecao<AtendenteSnapshot>(arquivoAtendentes),
    lerColecao<AtendimentoSnapshot>(arquivoAtendimentos),
    lerColecao<MensagemSnapshot>(arquivoMensagens),
  ]);

  const times = new Map(timesSnap.map((s) => [s.id, Time.restaurar(s)]));
  const atendentes = new Map(atendentesSnap.map((s) => [s.id, Atendente.restaurar(s)]));
  const atendimentos = new Map(atendimentosSnap.map((s) => [s.id, Atendimento.restaurar(s)]));
  const mensagens = new Map(mensagensSnap.map((s) => [s.id, Mensagem.restaurar(s)]));

  return {
    times: new FileTimeRepository(arquivoTimes, times),
    atendentes: new FileAtendenteRepository(arquivoAtendentes, atendentes),
    atendimentos: new FileAtendimentoRepository(arquivoAtendimentos, atendimentos),
    mensagens: new FileMensagemRepository(arquivoMensagens, mensagens),
    possuiEstado: times.size > 0 || atendentes.size > 0,
  };
}
