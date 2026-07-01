/**
 * @packageDocumentation
 * Contratos públicos compartilhados entre o back-end (`@flowpay/api`) e o
 * front-end (`@flowpay/web`).
 *
 * Manter estes tipos num pacote único garante uma **fonte única de verdade**
 * para os contratos de API e dos eventos de tempo real, evitando divergência
 * entre cliente e servidor.
 */

export * from './enums.js';
export * from './dtos.js';
export * from './events.js';
