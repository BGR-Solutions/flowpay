import { describe, expect, it } from 'vitest';
import { montarCenario } from '../../testing/build-motor.js';
import { RegraNegocioError } from '../errors.js';

describe('MotorDistribuicao', () => {
  describe('roteamento por assunto', () => {
    it('encaminha "Problemas com cartão" para o Time Cartões', async () => {
      const { motor, times } = await montarCenario();
      const time = await times.buscarPorTipo('CARTOES');

      const atendimento = await motor.criarAtendimento({
        clienteId: 'cliente-1',
        assunto: 'PROBLEMA_CARTAO',
        canal: 'API',
      });

      expect(atendimento.timeId).toBe(time?.id);
    });

    it('encaminha "Contratação de empréstimo" para o Time Empréstimos', async () => {
      const { motor, times } = await montarCenario();
      const time = await times.buscarPorTipo('EMPRESTIMOS');

      const atendimento = await motor.criarAtendimento({
        clienteId: 'cliente-1',
        assunto: 'CONTRATACAO_EMPRESTIMO',
        canal: 'API',
      });

      expect(atendimento.timeId).toBe(time?.id);
    });

    it('encaminha demais assuntos para o Time Outros', async () => {
      const { motor, times } = await montarCenario();
      const time = await times.buscarPorTipo('OUTROS');

      const atendimento = await motor.criarAtendimento({
        clienteId: 'cliente-1',
        assunto: 'OUTRO',
        canal: 'API',
      });

      expect(atendimento.timeId).toBe(time?.id);
    });
  });

  describe('alocação', () => {
    it('aloca imediatamente quando há atendente com vaga', async () => {
      const { motor } = await montarCenario();

      const atendimento = await motor.criarAtendimento({
        clienteId: 'cliente-1',
        assunto: 'PROBLEMA_CARTAO',
        canal: 'API',
      });

      expect(atendimento.status).toBe('EM_ATENDIMENTO');
      expect(atendimento.atendenteId).toBeDefined();
    });

    it('distribui de forma equilibrada (least-loaded) entre atendentes', async () => {
      const { motor, atendentes } = await montarCenario({
        times: [{ tipo: 'CARTOES', nome: 'Cartões', atendentes: ['A', 'B'] }],
      });

      // 4 atendimentos entre 2 atendentes -> 2 e 2.
      for (let i = 0; i < 4; i += 1) {
        await motor.criarAtendimento({
          clienteId: `cliente-${i}`,
          assunto: 'PROBLEMA_CARTAO',
          canal: 'API',
        });
      }

      const cargas = (await atendentes.listar()).map((a) => a.cargaAtual).sort();
      expect(cargas).toEqual([2, 2]);
    });

    it('nunca ultrapassa a capacidade máxima de 3 por atendente', async () => {
      const { motor, atendentes } = await montarCenario({
        times: [{ tipo: 'OUTROS', nome: 'Outros', atendentes: ['Solo'] }],
      });

      for (let i = 0; i < 10; i += 1) {
        await motor.criarAtendimento({
          clienteId: `cliente-${i}`,
          assunto: 'OUTRO',
          canal: 'API',
        });
      }

      const [solo] = await atendentes.listar();
      expect(solo?.cargaAtual).toBe(3);
    });
  });

  describe('enfileiramento', () => {
    it('enfileira quando todos os atendentes estão lotados', async () => {
      const { motor, times } = await montarCenario({
        times: [{ tipo: 'OUTROS', nome: 'Outros', atendentes: ['Solo'] }],
      });

      const alocados = [];
      for (let i = 0; i < 3; i += 1) {
        alocados.push(
          await motor.criarAtendimento({
            clienteId: `cliente-${i}`,
            assunto: 'OUTRO',
            canal: 'API',
          }),
        );
      }
      const enfileirado = await motor.criarAtendimento({
        clienteId: 'cliente-fila',
        assunto: 'OUTRO',
        canal: 'API',
      });

      expect(alocados.every((a) => a.status === 'EM_ATENDIMENTO')).toBe(true);
      expect(enfileirado.status).toBe('AGUARDANDO');

      const time = await times.buscarPorTipo('OUTROS');
      expect(time?.fila).toContain(enfileirado.id);
    });
  });

  describe('finalização e despacho FIFO', () => {
    it('ao finalizar, puxa o próximo da fila respeitando a ordem FIFO', async () => {
      const { motor, atendimentos } = await montarCenario({
        times: [{ tipo: 'OUTROS', nome: 'Outros', atendentes: ['Solo'] }],
      });

      const emAtendimento = [];
      for (let i = 0; i < 3; i += 1) {
        emAtendimento.push(
          await motor.criarAtendimento({
            clienteId: `ativo-${i}`,
            assunto: 'OUTRO',
            canal: 'API',
          }),
        );
      }
      const primeiroDaFila = await motor.criarAtendimento({
        clienteId: 'fila-1',
        assunto: 'OUTRO',
        canal: 'API',
      });
      const segundoDaFila = await motor.criarAtendimento({
        clienteId: 'fila-2',
        assunto: 'OUTRO',
        canal: 'API',
      });

      await motor.finalizarAtendimento(emAtendimento[0]!.id);

      const primeiro = await atendimentos.buscarPorId(primeiroDaFila.id);
      const segundo = await atendimentos.buscarPorId(segundoDaFila.id);
      expect(primeiro?.status).toBe('EM_ATENDIMENTO');
      expect(segundo?.status).toBe('AGUARDANDO');
    });

    it('rejeita finalizar um atendimento que não está em andamento', async () => {
      const { motor } = await montarCenario({
        times: [{ tipo: 'OUTROS', nome: 'Outros', atendentes: ['Solo'] }],
      });

      for (let i = 0; i < 3; i += 1) {
        await motor.criarAtendimento({
          clienteId: `ativo-${i}`,
          assunto: 'OUTRO',
          canal: 'API',
        });
      }
      const aguardando = await motor.criarAtendimento({
        clienteId: 'aguardando',
        assunto: 'OUTRO',
        canal: 'API',
      });

      await expect(motor.finalizarAtendimento(aguardando.id)).rejects.toBeInstanceOf(
        RegraNegocioError,
      );
    });
  });

  describe('idempotência de negócio', () => {
    it('não cria dois atendimentos ativos para o mesmo cliente', async () => {
      const { motor, atendimentos } = await montarCenario();

      const primeiro = await motor.criarAtendimento({
        clienteId: 'cliente-x',
        assunto: 'PROBLEMA_CARTAO',
        canal: 'WHATSAPP',
      });
      const segundo = await motor.criarAtendimento({
        clienteId: 'cliente-x',
        assunto: 'PROBLEMA_CARTAO',
        canal: 'WHATSAPP',
      });

      expect(segundo.id).toBe(primeiro.id);
      expect(await atendimentos.listar()).toHaveLength(1);
    });
  });

  describe('concorrência', () => {
    it('respeita o limite de 3 mesmo sob criações concorrentes', async () => {
      const { motor, atendentes, times } = await montarCenario({
        times: [{ tipo: 'OUTROS', nome: 'Outros', atendentes: ['Solo'] }],
      });

      // 20 criações disparadas simultaneamente contra 1 atendente (capacidade 3).
      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          motor.criarAtendimento({
            clienteId: `cliente-${i}`,
            assunto: 'OUTRO',
            canal: 'API',
          }),
        ),
      );

      const [solo] = await atendentes.listar();
      const time = await times.buscarPorTipo('OUTROS');
      expect(solo?.cargaAtual).toBe(3);
      expect(time?.tamanhoFila).toBe(17);
    });
  });
});
