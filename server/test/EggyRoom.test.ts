import assert from "node:assert/strict";
import { boot, ColyseusTestServer } from "@colyseus/testing";
import appConfig from "../src/app.config.js";
import type { EggyState } from "../src/rooms/schema/EggyState.js";

describe("EggyRoom", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => { colyseus = await boot(appConfig); });
  after(async () => { await colyseus.shutdown(); });
  beforeEach(async () => { await colyseus.cleanup(); });

  it("syncs two players and clamps impossible movement", async () => {
    const serverRoom = await colyseus.createRoom<EggyState>("eggy_city", { code: "TEST42" });
    const first = await colyseus.connectTo(serverRoom, { name: "Alpha", character: 2, city: 0 });
    const second = await colyseus.connectTo(serverRoom, { name: "Beta", character: 4, city: 0 });

    await serverRoom.waitForNextPatch();
    assert.equal(first.state.players.size, 2);
    assert.equal(second.state.players.get(first.sessionId)?.name, "Alpha");

    first.send("state", { sequence: 1, city: 0, x: 99999, y: 0, z: 0, rotation: 0, action: "walk" });
    await serverRoom.waitForNextPatch();
    assert.ok(first.state.players.get(first.sessionId)!.x < 20, "server must reject teleport-sized movement");
  });

  it("allows a validated city transfer and relays chat", async () => {
    const serverRoom = await colyseus.createRoom<EggyState>("eggy_city", { code: "CITY88" });
    const first = await colyseus.connectTo(serverRoom, { name: "Alpha", city: 0 });
    const second = await colyseus.connectTo(serverRoom, { name: "Beta", city: 0 });
    first.onMessage("chat", () => {});
    const received = new Promise<any>((resolve) => second.onMessage("chat", resolve));

    first.send("state", { sequence: 1, city: 6, x: 0, y: 14, z: -30, teleport: true });
    first.send("chat", { text: " hello online " });
    const chat = await received;
    await serverRoom.waitForNextPatch();

    assert.equal(first.state.players.get(first.sessionId)?.city, 6);
    assert.equal(chat.text, "hello online");
    assert.equal(chat.sessionId, first.sessionId);
  });
});
