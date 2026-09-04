import { schema, t, type SchemaType } from "@colyseus/schema";

export const NetworkPlayer = schema({
  name: t.string().default("Player"),
  character: t.number().default(0),
  style: t.string().default("cinematic"),
  city: t.number().default(0),
  x: t.number().default(0),
  y: t.number().default(0.01),
  z: t.number().default(0),
  rotation: t.number().default(0),
  vx: t.number().default(0),
  vy: t.number().default(0),
  vz: t.number().default(0),
  action: t.string().default("idle"),
  sequence: t.number().default(0),
  connected: t.boolean().default(true),
});
export type NetworkPlayer = SchemaType<typeof NetworkPlayer>;

export const DanBoState = schema({
  code: t.string().default("PUBLIC"),
  players: t.map(NetworkPlayer),
});
export type DanBoState = SchemaType<typeof DanBoState>;
