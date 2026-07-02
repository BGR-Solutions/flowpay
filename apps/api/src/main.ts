import { carregarConfig } from './config.js';
import { criarContainer } from './container.js';
import { Simulador } from './infra/simulator.js';
import { construirServidor } from './interface/http/server.js';

/**
 * Ponto de entrada da aplicação: carrega config, monta o container, sobe o
 * servidor e, opcionalmente, inicia o simulador de tráfego.
 */
async function main(): Promise<void> {
  const config = carregarConfig();
  const container = await criarContainer(config);
  const app = await construirServidor(container, config);

  if (config.simuladorHabilitado) {
    const simulador = new Simulador(container);
    simulador.iniciar();
    app.log.info('Simulador de atendimentos habilitado.');
  }

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Documentação disponível em http://localhost:${config.port}/docs`);
}

main().catch((erro) => {
  console.error('Falha ao iniciar a aplicação:', erro);
  process.exit(1);
});
