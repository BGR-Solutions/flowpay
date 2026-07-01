import type { Assunto } from '@flowpay/shared';
import type { Container } from '../container.js';

/** Assuntos usados pelo simulador, com distribuição uniforme. */
const ASSUNTOS_SIMULADOS: Assunto[] = [
  'PROBLEMA_CARTAO',
  'CONTRATACAO_EMPRESTIMO',
  'OUTRO',
];

/**
 * Simulador de tráfego: gera atendimentos e finaliza aleatoriamente os
 * existentes, mantendo o dashboard "vivo" durante demonstrações.
 *
 * Não faz parte do domínio; é um utilitário de desenvolvimento que exercita a
 * API pública (motor + canal), como faria um cliente real.
 */
export class Simulador {
  /** Handle do intervalo de geração de novos atendimentos. */
  private geracaoHandle?: ReturnType<typeof setInterval>;
  /** Handle do intervalo de finalização de atendimentos. */
  private finalizacaoHandle?: ReturnType<typeof setInterval>;
  /** Contador para gerar ids de cliente distintos. */
  private contador = 0;

  /**
   * @param container - Dependências da aplicação.
   */
  constructor(private readonly container: Container) {}

  /**
   * Inicia a simulação.
   *
   * @param intervaloGeracaoMs - Intervalo entre novos atendimentos.
   * @param intervaloFinalizacaoMs - Intervalo entre finalizações.
   */
  iniciar(intervaloGeracaoMs = 2500, intervaloFinalizacaoMs = 4000): void {
    this.geracaoHandle = setInterval(() => {
      void this.gerarAtendimento();
    }, intervaloGeracaoMs);

    this.finalizacaoHandle = setInterval(() => {
      void this.finalizarAleatorio();
    }, intervaloFinalizacaoMs);
  }

  /**
   * Interrompe a simulação e limpa os timers.
   */
  parar(): void {
    if (this.geracaoHandle) clearInterval(this.geracaoHandle);
    if (this.finalizacaoHandle) clearInterval(this.finalizacaoHandle);
  }

  /**
   * Gera um novo atendimento simulando uma mensagem de WhatsApp.
   */
  private async gerarAtendimento(): Promise<void> {
    this.contador += 1;
    const assunto = ASSUNTOS_SIMULADOS[this.contador % ASSUNTOS_SIMULADOS.length]!;
    const texto = textoParaAssunto(assunto);
    await this.container.canal.simularEntrada(
      `+5511${String(900000000 + this.contador).slice(-9)}`,
      texto,
      `Cliente ${this.contador}`,
    );
  }

  /**
   * Finaliza um atendimento em andamento escolhido aleatoriamente.
   */
  private async finalizarAleatorio(): Promise<void> {
    const emAtendimento = (await this.container.atendimentos.listar()).filter(
      (a) => a.status === 'EM_ATENDIMENTO',
    );
    if (emAtendimento.length === 0) return;
    const alvo = emAtendimento[Math.floor(Math.random() * emAtendimento.length)]!;
    await this.container.motor.finalizarAtendimento(alvo.id);
  }
}

/**
 * Retorna um texto representativo para um assunto (aciona o classificador).
 *
 * @param assunto - Assunto desejado.
 * @returns Texto correspondente.
 */
function textoParaAssunto(assunto: Assunto): string {
  switch (assunto) {
    case 'PROBLEMA_CARTAO':
      return 'Estou com um problema no meu cartão';
    case 'CONTRATACAO_EMPRESTIMO':
      return 'Gostaria de contratar um empréstimo';
    default:
      return 'Tenho uma dúvida geral';
  }
}
