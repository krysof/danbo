import { Client, CloseCode, Room } from "colyseus";
import { EggyState, NetworkPlayer } from "./schema/EggyState.js";
import { playerConnected, playerDisconnected, roomCreated, roomDisposed } from "../metrics.js";

const MAX_CLIENTS = 8;
const WORLD_LIMIT = 700;
const HEIGHT_MIN = -40;
const HEIGHT_MAX = 180;
const MAX_MOVE_UNITS_PER_SECOND = 52;
const POSITION_GRACE = 3.5;
const ACTIONS = new Set(["idle", "walk", "jump", "grab", "punch", "kick"]);

type StateMessage = {
  sequence?: number;
  city?: number;
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  action?: string;
  teleport?: boolean;
};

type ProfileMessage = { name?: string; character?: number; style?: string };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const cleanCode = (value: unknown) => {
  const code = String(value || "PUBLIC").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return code || "PUBLIC";
};
const cleanName = (value: unknown) => {
  const name = String(value || "Player").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 16);
  return name || "Player";
};
const cleanText = (value: unknown) =>
  String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 40);

export class EggyRoom extends Room<{ state: EggyState }> {
  maxClients = MAX_CLIENTS;
  state = new EggyState();
  private lastAcceptedAt = new Map<string, number>();
  private lastChatAt = new Map<string, number>();

  messages = {
    state: (client: Client, message: StateMessage) => this.receiveState(client, message),
    profile: (client: Client, message: ProfileMessage) => this.receiveProfile(client, message),
    chat: (client: Client, message: { text?: string }) => this.receiveChat(client, message),
  };

  onCreate(options: { code?: string }) {
    roomCreated();
    this.state.code = cleanCode(options?.code);
    this.setMetadata({ code: this.state.code });
    this.setPatchRate(50); // 20 Hz authoritative snapshots
  }

  onJoin(client: Client, options: ProfileMessage & StateMessage) {
    playerConnected(client.sessionId);
    const player = new NetworkPlayer({
      name: cleanName(options?.name),
      character: clamp(Math.floor(finite(options?.character, 0)), 0, 7),
      style: options?.style === "classic" ? "classic" : "cinematic",
      city: clamp(Math.floor(finite(options?.city, 0)), 0, 7),
      x: clamp(finite(options?.x, 0), -WORLD_LIMIT, WORLD_LIMIT),
      y: clamp(finite(options?.y, 0.01), HEIGHT_MIN, HEIGHT_MAX),
      z: clamp(finite(options?.z, 0), -WORLD_LIMIT, WORLD_LIMIT),
      rotation: finite(options?.rotation, 0),
      connected: true,
    });
    this.state.players.set(client.sessionId, player);
    this.lastAcceptedAt.set(client.sessionId, Date.now());
  }

  onDrop(client: Client, _code: CloseCode) {
    playerDisconnected(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;
    this.allowReconnection(client, 20).catch(() => {});
  }

  onReconnect(client: Client) {
    playerConnected(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = true;
    this.lastAcceptedAt.set(client.sessionId, Date.now());
  }

  onLeave(client: Client, _code: CloseCode) {
    playerDisconnected(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.lastAcceptedAt.delete(client.sessionId);
    this.lastChatAt.delete(client.sessionId);
  }

  onDispose() {
    roomDisposed();
    this.lastAcceptedAt.clear();
    this.lastChatAt.clear();
  }

  private receiveProfile(client: Client, message: ProfileMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    if (message?.name !== undefined) player.name = cleanName(message.name);
    if (message?.character !== undefined) {
      player.character = clamp(Math.floor(finite(message.character, player.character)), 0, 7);
    }
    if (message?.style !== undefined) player.style = message.style === "classic" ? "classic" : "cinematic";
  }

  private receiveState(client: Client, message: StateMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !message || typeof message !== "object") return;

    const sequence = Math.max(0, Math.floor(finite(message.sequence, 0)));
    if (sequence <= player.sequence) return;

    const now = Date.now();
    const previousAt = this.lastAcceptedAt.get(client.sessionId) || now - 50;
    const elapsed = clamp((now - previousAt) / 1000, 0.02, 0.5);
    const nextCity = clamp(Math.floor(finite(message.city, player.city)), 0, 7);
    const cityChanged = nextCity !== player.city;
    const allowTeleport = cityChanged && message.teleport === true;

    let nextX = clamp(finite(message.x, player.x), -WORLD_LIMIT, WORLD_LIMIT);
    let nextY = clamp(finite(message.y, player.y), HEIGHT_MIN, HEIGHT_MAX);
    let nextZ = clamp(finite(message.z, player.z), -WORLD_LIMIT, WORLD_LIMIT);

    if (!allowTeleport) {
      const dx = nextX - player.x;
      const dy = nextY - player.y;
      const dz = nextZ - player.z;
      const distance = Math.hypot(dx, dy, dz);
      const allowed = MAX_MOVE_UNITS_PER_SECOND * elapsed + POSITION_GRACE;
      if (distance > allowed && distance > 0) {
        const scale = allowed / distance;
        nextX = player.x + dx * scale;
        nextY = player.y + dy * scale;
        nextZ = player.z + dz * scale;
      }
    }

    player.city = nextCity;
    player.x = nextX;
    player.y = nextY;
    player.z = nextZ;
    player.rotation = finite(message.rotation, player.rotation);
    player.vx = clamp(finite(message.vx, 0), -3, 3);
    player.vy = clamp(finite(message.vy, 0), -3, 3);
    player.vz = clamp(finite(message.vz, 0), -3, 3);
    player.action = ACTIONS.has(String(message.action)) ? String(message.action) : "idle";
    player.sequence = sequence;
    player.connected = true;
    this.lastAcceptedAt.set(client.sessionId, now);
  }

  private receiveChat(client: Client, message: { text?: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    const now = Date.now();
    if (now - (this.lastChatAt.get(client.sessionId) || 0) < 600) return;
    const text = cleanText(message?.text);
    if (!text) return;
    this.lastChatAt.set(client.sessionId, now);
    this.broadcast("chat", { sessionId: client.sessionId, city: player.city, text });
  }
}
