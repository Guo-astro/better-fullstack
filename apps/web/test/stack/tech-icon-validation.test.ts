import { describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { getRemoteIconUrlError } from "@/lib/stack/tech-icon-validation";

describe("tech icon validation", () => {
  it.each([
    "https://cdn.simpleicons.org/qdrant/DC244C",
    "https://cdn.simpleicons.org/expo",
    "https://cdn.simpleicons.org/nodedotjs/5FA04E",
    "https://example.com/icon.svg",
  ])("accepts %s without depending on CDN availability", (url) => {
    expect(getRemoteIconUrlError(url)).toBeNull();
  });

  it.each([
    "https://cdn.simpleicons.org/qdrantt/DC244C",
    "https://cdn.simpleicons.org/",
    "http://cdn.simpleicons.org/qdrant/DC244C",
    "not-a-url",
  ])("rejects invalid icon URL %s", (url) => {
    expect(getRemoteIconUrlError(url)).not.toBeNull();
  });

  it("keeps static checks working when the CDN blocks requests and reports failures in live mode", async () => {
    const directory = await mkdtemp(join(tmpdir(), "bfs-icon-validation-"));
    const preload = join(directory, "blocked-cdn.js");
    await Bun.write(
      preload,
      'globalThis.fetch = () => Promise.resolve(new Response("Forbidden", { status: 403 }));',
    );

    const runValidator = async (args: string[]) => {
      const child = Bun.spawn(
        [process.execPath, "--preload", preload, "scripts/validate-tech-icons.ts", ...args],
        {
          cwd: fileURLToPath(new URL("../../", import.meta.url)),
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      return { exitCode, stdout, stderr };
    };

    try {
      const offline = await runValidator([]);
      expect(offline.exitCode).toBe(0);
      expect(offline.stdout).toContain("static mode");

      const live = await runValidator(["--live"]);
      expect(live.exitCode).toBe(1);
      expect(live.stderr).toContain("icon returned 403");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
