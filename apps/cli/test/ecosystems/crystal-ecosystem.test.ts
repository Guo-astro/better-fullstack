import {
  getVirtualFileContent as content,
  hasVirtualFile as hasFile,
} from "@test/support/virtual-tree-utils";
import { describe, expect, it, spyOn } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildBtsConfigForPersistence } from "@/config/bts-config";
import { SUPPORTED_STACK_UPDATE_KEYS } from "@/helpers/core/stack-update";
import { create, createVirtual } from "@/index";
import { generateReproducibleCommand } from "@/lifecycle/generate-reproducible-command";
import { createProjectOperation, planProjectOperation } from "@/operations/project-create";
import { buildProjectConfig, getInstallCommand } from "@/operations/stack-helpers";
import * as configPrompts from "@/prompts/core/config-prompts";
import { createStackPart } from "@/types";

describe("Crystal create contract", () => {
  it("preserves existing files when a later ecosystem selection rejects supplied flags", async () => {
    const root = await mkdtemp(join(process.cwd(), ".bfs-crystal-late-overwrite-"));
    const gather = spyOn(configPrompts, "gatherConfig").mockImplementation(async () => {
      return buildProjectConfig({ ecosystem: "crystal", database: "postgres" });
    });
    try {
      const destination = join(root, "service");
      await mkdir(destination);
      await writeFile(join(destination, "keep.txt"), "preserve me");
      const result = await create(destination, {
        database: "postgres",
        directoryConflict: "overwrite",
        install: false,
        git: false,
        aiDocs: ["none"],
        packageManager: "bun",
        versionChannel: "stable",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("database");
      expect(await readFile(join(destination, "keep.txt"), "utf8")).toBe("preserve me");
    } finally {
      gather.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns executable setup guidance for a custom Crystal service directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "bfs-crystal-mcp-path-"));
    try {
      const result = await createProjectOperation.invoke({
        projectName: "custom-service",
        targetDir: root,
        part: ["backend:crystal:kemal@services/audit%20api"],
        aiDocs: ["none"],
      });
      expect(result.failed).toBe(false);
      expect(
        await readFile(join(root, "custom-service/services/audit api/shard.yml"), "utf8"),
      ).toContain("kemal");
      expect(result.output.message).toContain("services/audit api");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid Crystal input before overwriting an existing directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "bfs-crystal-overwrite-"));
    try {
      const destination = join(root, "service");
      await mkdir(destination);
      await writeFile(join(destination, "keep.txt"), "preserve me");
      const result = await create(destination, {
        ecosystem: "crystal",
        crystalWebFramework: "kemal",
        database: "sqlite",
        directoryConflict: "overwrite",
        install: false,
        git: false,
        aiDocs: ["none"],
        packageManager: "bun",
      });
      expect(result.success).toBe(false);
      expect(await readFile(join(destination, "keep.txt"), "utf8")).toBe("preserve me");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("plans native files through the actual MCP operation and rejects an unowned database", async () => {
    const result = await planProjectOperation.invoke({
      projectName: "crystal-mcp",
      ecosystem: "crystal",
      crystalWebFramework: "kemal",
    });
    expect(result.failed).toBe(false);
    expect(result.output.files).toContain("shard.yml");
    expect(result.output.files).toContain("scripts/http_proof.cr");
    expect(result.output.files).not.toContain("package.json");
    await expect(
      planProjectOperation.invoke({
        projectName: "crystal-mcp",
        part: [
          "frontend:typescript:react-vite",
          "backend:crystal:kemal",
          "database:universal:sqlite",
        ],
      }),
    ).rejects.toThrow("database adapter");
  });

  it("shares MCP defaults and replay without TypeScript defaults", () => {
    const config = buildProjectConfig({ ecosystem: "crystal", projectName: "9.my-service" });
    expect(config.crystalWebFramework).toBe("kemal");
    expect(config.database).toBe("none");
    expect(config.frontend).toEqual(["none"]);
    const command = generateReproducibleCommand(config);
    expect(command).toContain("--crystal-web-framework kemal");
    expect(command).not.toContain("--yes");
  });

  it("persists Crystal ownership and exposes its schema field to updates", () => {
    const backend = createStackPart({
      role: "backend",
      ecosystem: "crystal",
      toolId: "kemal",
      id: "audit",
      targetPath: "services/audit",
    });
    const web = createStackPart({
      role: "frontend",
      ecosystem: "typescript",
      toolId: "react-vite",
      id: "client",
      targetPath: "apps/web",
    });
    const config = { ...buildProjectConfig({ ecosystem: "crystal" }), stackParts: [backend, web] };
    const saved = buildBtsConfigForPersistence(config, {
      version: "2.8.0",
      createdAt: "2026-10-23T00:00:00.000Z",
    });
    expect(saved.crystalWebFramework).toBe("kemal");
    expect(saved.stackParts?.find((part) => part.id === "audit")?.targetPath).toBe(
      "services/audit",
    );
    expect(saved.stackParts?.find((part) => part.id === "client")?.targetPath).toBe("apps/web");
    expect(SUPPORTED_STACK_UPDATE_KEYS).toContain("crystalWebFramework");
    const command = generateReproducibleCommand(config);
    expect(command).toContain("services/audit");
    expect(command).not.toContain("--yes");
  });

  it("renders native commands and a valid shard name for a valid BF name", async () => {
    const result = await createVirtual({ ecosystem: "crystal", projectName: "9.my-service" });
    expect(result.success).toBe(true);
    if (!result.tree) throw new Error(result.error);
    expect(content(result.tree.root, "shard.yml")).toContain("name: app_9_my_service");
    expect(content(result.tree.root, "shard.yml")).toContain("version: 1.15.0");
    expect(content(result.tree.root, "src/server.cr")).toContain("Kemal.run(args: nil)");
    expect(content(result.tree.root, "scripts/http_proof.cr")).toContain(
      "process.signal(Signal::TERM)",
    );
    expect(hasFile(result.tree.root, "package.json")).toBe(false);
  });

  it.each([
    ["lucky", "luckyframework/lucky", "class AppServer < Lucky::BaseAppServer", "413"],
    ["athena", "athena-framework/framework", "ATH.run(", "413"],
    ["marten", "martenframework/marten", "Marten.start", "400"],
  ] as const)(
    "renders the %s HTTP contract with its own server and shared proof",
    async (framework, shard, server, oversizedStatus) => {
      const result = await createVirtual({ ecosystem: "crystal", crystalWebFramework: framework });
      expect(result.success).toBe(true);
      if (!result.tree) throw new Error(result.error);
      const root = result.tree.root;
      expect(content(root, "shard.yml")).toContain(`github: ${shard}`);
      expect(content(root, "shard.yml")).not.toContain("kemal");
      expect(content(root, "src/server.cr")).toContain(server);
      expect(hasFile(root, "src/greeting_request.cr")).toBe(true);
      expect(hasFile(root, "spec/greeting_request_spec.cr")).toBe(true);
      expect(hasFile(root, "src/http_guard.cr")).toBe(framework !== "marten");
      expect(content(root, "scripts/http_proof.cr")).toContain(
        `oversized.status_code == ${oversizedStatus}`,
      );
      const config = buildProjectConfig({ ecosystem: "crystal", crystalWebFramework: framework });
      expect(generateReproducibleCommand(config)).toContain(`--crystal-web-framework ${framework}`);
      expect(getInstallCommand("crystal", "svc", undefined, undefined, undefined, undefined, framework)).toContain(
        framework === "athena" ? "crystal spec -Dwithout_libmagic" : "crystal spec &&",
      );
    },
  );

  it("rejects unsupported selections before rendering", async () => {
    const result = await createVirtual({ ecosystem: "crystal", database: "postgres" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("database");
    expect(() => buildProjectConfig({ ecosystem: "crystal", addons: ["gitleaks"] })).toThrow(
      "addons",
    );
  });
});
