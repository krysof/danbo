import cors from "cors";
import { createEndpoint, createRouter, defineRoom, defineServer } from "colyseus";
import { EggyRoom } from "./rooms/EggyRoom.js";
import { runtimeMetrics } from "./metrics.js";

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://eggy.ff18.com,http://localhost:8126,http://127.0.0.1:8126")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const server = defineServer({
  rooms: {
    eggy_city: defineRoom(EggyRoom).filterBy(["code"]),
  },
  routes: createRouter({
    health: createEndpoint("/health", { method: "GET" }, async () => ({
      ok: true,
      service: "eggy-multiplayer",
      capacityPerRoom: 8,
      ...runtimeMetrics(),
    })),
  }),
  express: (app) => {
    app.use(cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error("Origin not allowed"));
      },
      credentials: true,
    }));
    app.get("/", (_req, res) => res.json({ service: "EGGY Multiplayer", status: "online" }));
  },
});

export default server;
