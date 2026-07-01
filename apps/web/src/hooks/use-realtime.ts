import type { EventoTempoReal } from '@flowpay/shared';
import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboard-store.js';

/**
 * Resolve a URL do WebSocket a partir da origem atual (compatível com o proxy
 * do Vite em dev e com o mesmo host em produção).
 *
 * @returns A URL `ws(s)://.../ws`.
 */
function urlWebSocket(): string {
  const protocolo = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocolo}://${window.location.host}/ws`;
}

/**
 * Mantém uma conexão WebSocket com o back-end, aplicando os eventos recebidos
 * ao store do dashboard e reconectando automaticamente em caso de queda.
 *
 * O snapshot inicial chega pelo próprio WebSocket ao conectar, então o
 * dashboard não precisa de chamadas REST para a carga inicial.
 */
export function useRealtime(): void {
  const setConectado = useDashboardStore((s) => s.setConectado);
  const aplicarEvento = useDashboardStore((s) => s.aplicarEvento);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconectar: ReturnType<typeof setTimeout> | undefined;
    let ativo = true;

    const conectar = () => {
      socket = new WebSocket(urlWebSocket());

      socket.onopen = () => setConectado(true);
      socket.onmessage = (evento) => {
        try {
          aplicarEvento(JSON.parse(evento.data) as EventoTempoReal);
        } catch {
          // Ignora mensagens malformadas.
        }
      };
      socket.onclose = () => {
        setConectado(false);
        if (ativo) reconectar = setTimeout(conectar, 1500);
      };
      socket.onerror = () => socket?.close();
    };

    conectar();

    return () => {
      ativo = false;
      if (reconectar) clearTimeout(reconectar);
      socket?.close();
    };
  }, [setConectado, aplicarEvento]);
}
