import { once } from "node:events";
import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertPortAvailable,
  parseVerifyPort,
} from "../scripts/cf-local-server.mjs";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) =>
          server.listening ? server.close(() => resolve()) : resolve(),
        ),
    ),
  );
});

describe("Cloudflare local verification server", () => {
  it("validates an explicit verification port", () => {
    expect(parseVerifyPort(undefined)).toBe(8787);
    expect(parseVerifyPort("43123")).toBe(43123);
    for (const value of ["0", "65536", "3.5", "not-a-port"]) {
      expect(() => parseVerifyPort(value)).toThrow(/CF_VERIFY_PORT/);
    }
  });

  it("refuses to trust a server that already owns the port", async () => {
    const blocker = createServer();
    servers.push(blocker);
    blocker.listen({ host: "127.0.0.1", port: 0 });
    await once(blocker, "listening");
    const address = blocker.address();
    if (!address || typeof address === "string") throw new Error("No TCP port");

    await expect(assertPortAvailable(address.port)).rejects.toThrow(
      /refusing to test an unowned server/,
    );
  });

});
