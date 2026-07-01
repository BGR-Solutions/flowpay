import type {
  AtendenteDTO,
  AtendimentoDTO,
  MensagemDTO,
  MetricasDTO,
  MetricasTimeDTO,
  SnapshotPayload,
  StatusAtendimento,
  TimeDTO,
} from '@flowpay/shared';
import { NaoEncontradoError } from '../../domain/errors.js';
import type {
  AtendenteRepository,
  AtendimentoRepository,
  MensagemRepository,
  TimeRepository,
} from '../../domain/ports/repositories.js';
import {
  atendenteParaDTO,
  atendimentoParaDTO,
  mensagemParaDTO,
  timeParaDTO,
} from '../mappers.js';

/**
 * Dependências das consultas de leitura.
 */
export interface ConsultasDeps {
  /** Repositório de times. */
  times: TimeRepository;
  /** Repositório de atendentes. */
  atendentes: AtendenteRepository;
  /** Repositório de atendimentos. */
  atendimentos: AtendimentoRepository;
  /** Repositório de mensagens. */
  mensagens: MensagemRepository;
}

/**
 * Filtros aceitos ao listar atendimentos.
 */
export interface FiltroAtendimentos {
  /** Filtra por estado. */
  status?: StatusAtendimento;
  /** Filtra por time. */
  timeId?: string;
}

/**
 * Serviço de leitura (CQRS-lite): concentra as consultas que alimentam o
 * dashboard, mantendo os casos de uso de escrita enxutos.
 */
export class Consultas {
  /**
   * @param deps - Repositórios injetados.
   */
  constructor(private readonly deps: ConsultasDeps) {}

  /**
   * @returns Todos os times com seus atendentes e filas.
   */
  async listarTimes(): Promise<TimeDTO[]> {
    const times = await this.deps.times.listar();
    return Promise.all(
      times.map(async (time) => timeParaDTO(time, await this.deps.atendentes.listarPorTime(time.id))),
    );
  }

  /**
   * @returns Todos os atendentes com sua carga atual.
   */
  async listarAtendentes(): Promise<AtendenteDTO[]> {
    const atendentes = await this.deps.atendentes.listar();
    return atendentes.map(atendenteParaDTO);
  }

  /**
   * Lista atendimentos, opcionalmente filtrados.
   *
   * @param filtro - Filtros de status/time.
   * @returns Atendimentos correspondentes, mais recentes primeiro.
   */
  async listarAtendimentos(filtro: FiltroAtendimentos = {}): Promise<AtendimentoDTO[]> {
    const atendimentos = await this.deps.atendimentos.listar();
    return atendimentos
      .filter((a) => (filtro.status ? a.status === filtro.status : true))
      .filter((a) => (filtro.timeId ? a.timeId === filtro.timeId : true))
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      .map(atendimentoParaDTO);
  }

  /**
   * Recupera um atendimento e seu histórico de mensagens.
   *
   * @param id - Id do atendimento.
   * @returns O atendimento e suas mensagens.
   * @throws {@link NaoEncontradoError} se o atendimento não existe.
   */
  async buscarAtendimento(
    id: string,
  ): Promise<{ atendimento: AtendimentoDTO; mensagens: MensagemDTO[] }> {
    const atendimento = await this.deps.atendimentos.buscarPorId(id);
    if (!atendimento) {
      throw new NaoEncontradoError('Atendimento', id);
    }
    const mensagens = await this.deps.mensagens.listarPorAtendimento(id);
    return {
      atendimento: atendimentoParaDTO(atendimento),
      mensagens: mensagens.map(mensagemParaDTO),
    };
  }

  /**
   * Monta o snapshot completo do sistema (times + atendimentos ativos) enviado
   * ao dashboard na conexão.
   *
   * @returns O snapshot atual.
   */
  async snapshot(): Promise<SnapshotPayload> {
    const [times, atendimentos] = await Promise.all([
      this.listarTimes(),
      this.deps.atendimentos.listar(),
    ]);
    return {
      times,
      atendimentosAtivos: atendimentos
        .filter((a) => a.status !== 'FINALIZADO')
        .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())
        .map(atendimentoParaDTO),
    };
  }

  /**
   * Calcula as métricas agregadas do dashboard.
   *
   * @returns Métricas globais e por time.
   */
  async metricas(): Promise<MetricasDTO> {
    const [times, atendentes, atendimentos] = await Promise.all([
      this.deps.times.listar(),
      this.deps.atendentes.listar(),
      this.deps.atendimentos.listar(),
    ]);

    const emAtendimento = atendimentos.filter((a) => a.status === 'EM_ATENDIMENTO');
    const aguardando = atendimentos.filter((a) => a.status === 'AGUARDANDO');
    const finalizados = atendimentos.filter((a) => a.status === 'FINALIZADO');

    const esperas = atendimentos
      .map((a) => a.tempoEsperaSegundos())
      .filter((v): v is number => v !== undefined);
    const atendimentosDur = finalizados
      .map((a) => a.tempoAtendimentoSegundos())
      .filter((v): v is number => v !== undefined);

    const porTime: MetricasTimeDTO[] = times.map((time) => {
      const doTime = atendentes.filter((a) => a.timeId === time.id);
      const capacidadeTotal = doTime.reduce((soma, a) => soma + a.capacidadeMax, 0);
      const ocupacao = doTime.reduce((soma, a) => soma + a.cargaAtual, 0);
      return {
        timeId: time.id,
        tipo: time.tipo,
        totalAtendentes: doTime.length,
        capacidadeTotal,
        ocupacao,
        percentualOcupacao: capacidadeTotal === 0 ? 0 : Math.round((ocupacao / capacidadeTotal) * 100),
        tamanhoFila: time.tamanhoFila,
      };
    });

    return {
      emAtendimento: emAtendimento.length,
      aguardando: aguardando.length,
      finalizados: finalizados.length,
      tempoMedioEsperaSegundos: media(esperas),
      tempoMedioAtendimentoSegundos: media(atendimentosDur),
      porTime,
    };
  }
}

/**
 * Média aritmética segura (retorna 0 para lista vazia).
 *
 * @param valores - Valores numéricos.
 * @returns A média, arredondada para 1 casa decimal.
 */
function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  const soma = valores.reduce((acc, v) => acc + v, 0);
  return Math.round((soma / valores.length) * 10) / 10;
}
