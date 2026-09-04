const connected = new Set<string>();
let rooms = 0;

export function roomCreated() { rooms += 1; }
export function roomDisposed() { rooms = Math.max(0, rooms - 1); }
export function playerConnected(sessionId: string) { connected.add(sessionId); }
export function playerDisconnected(sessionId: string) { connected.delete(sessionId); }
export function runtimeMetrics() {
  return { rooms, players: connected.size };
}
