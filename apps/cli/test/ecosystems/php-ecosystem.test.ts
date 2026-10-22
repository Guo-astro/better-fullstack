import { getGraphProjectTasks } from "@better-fullstack/template-generator";
import {
  cliInputToProjectConfigPartial,
  parseStackPartSpecs,
  PHP_RECIPE_REASONS,
} from "@better-fullstack/types";
import { getVirtualTreeFileContent, hasVirtualFile } from "@test/support/virtual-tree-utils";
import { describe, expect, it } from "bun:test";
import { z } from "zod";

import { buildBtsConfigForPersistence, previewBtsConfigUpdate } from "@/config/bts-config";
import { createVirtual } from "@/index";
import { planProjectOperation } from "@/operations/project-create";
import { MCP_PLAN_CREATE_SCHEMA, MCP_STACK_UPDATE_SCHEMA } from "@/operations/stack-input";
import { resolvePhpWebFrameworkPrompt } from "@/prompts/ecosystems/php-ecosystem";

describe("PHP generation and lifecycle", () => {
  it("plans a native PHP project through the actual MCP operation", async () => {
    const result = await planProjectOperation.invoke({
      projectName: "php-mcp",
      ecosystem: "php",
      phpWebFramework: "slim",
    });
    expect(result.failed).toBe(false);
    expect(result.output.files).toContain("composer.json");
    expect(result.output.files).not.toContain("package.json");
    expect(result.output.stackPartSpecs).toContain("backend:php:slim");
    expect(result.output.stackPartSpecs).not.toContain("backend.api:php:rest");
  });

  it("uses a valid Composer package name for accepted project names", async () => {
    const result = await createVirtual({
      projectName: "My_App",
      ecosystem: "php",
      phpWebFramework: "slim",
    });
    expect(result.success).toBe(true);
    expect(JSON.parse(getVirtualTreeFileContent(result.tree!, "composer.json")).name).toBe(
      "app/my-app",
    );
  });

  it("generates a Composer-owned app and preserves native instructions", async () => {
    const result = await createVirtual({
      projectName: "php-service",
      ecosystem: "php",
      phpWebFramework: "slim",
      aiDocs: ["agents-md"],
    });
    expect(result.success).toBe(true);
    const tree = result.tree!;
    const manifest: unknown = JSON.parse(getVirtualTreeFileContent(tree, "composer.json"));
    expect(manifest).toMatchObject({
      require: { "slim/slim": "~4.15.3", "slim/psr7": "~1.8.0" },
      "require-dev": { "phpunit/phpunit": "~13.4.3" },
    });
    expect(hasVirtualFile(tree.root, "package.json")).toBe(false);
    expect(hasVirtualFile(tree.root, "bin/proof-http.php")).toBe(true);
    expect(getVirtualTreeFileContent(tree, "README.md")).toContain("composer run dev");
    expect(getVirtualTreeFileContent(tree, "README.md")).toContain("composer run proof:http");
    expect(getVirtualTreeFileContent(tree, "AGENTS.md")).toContain("composer");
    const saved = buildBtsConfigForPersistence(tree.config, {
      version: "0.0.0",
      createdAt: "2026-10-22T00:00:00.000Z",
    });
    const updated = previewBtsConfigUpdate(saved, {});
    expect(updated.phpWebFramework).toBe("slim");
    expect(updated.stackParts).toEqual(saved.stackParts);
  });

  it("creates separately owned PHP services beside React", async () => {
    const graph = cliInputToProjectConfigPartial({
      part: [
        "frontend:typescript:react-vite",
        "backend:php:slim:catalog",
        "backend:php:slim:billing",
      ],
    });
    const result = await createVirtual({
      ...graph,
      projectName: "php-composed",
      database: "none",
      addons: [],
    });
    expect(result.success).toBe(true);
    const tree = result.tree!;
    for (const service of ["catalog", "billing"]) {
      expect(hasVirtualFile(tree.root, `services/${service}/composer.json`)).toBe(true);
      expect(hasVirtualFile(tree.root, `services/${service}/package.json`)).toBe(false);
      expect(getVirtualTreeFileContent(tree, `services/${service}/README.md`)).toContain(
        "composer run dev",
      );
    }
    const tasks = getGraphProjectTasks(tree.config).filter((task) =>
      task.path.startsWith("services/"),
    );
    expect(tasks.map((task) => task.path)).toEqual(["services/catalog", "services/billing"]);
    expect(tasks.every((task) => task.setup?.includes("composer install"))).toBe(true);
    expect(tasks[1]?.dev).toContain("PORT=8081");
    expect(getVirtualTreeFileContent(tree, "services/catalog/.env")).toContain(
      "CORS_ORIGIN=http://localhost:",
    );
    expect(hasVirtualFile(tree.root, "apps/web/package.json")).toBe(true);
    expect(getVirtualTreeFileContent(tree, "README.md")).toContain("composer");
  });

  it("rejects unsupported selections before emitting files", async () => {
    const result = await createVirtual({
      ecosystem: "php",
      phpWebFramework: "slim",
      database: "sqlite",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe(PHP_RECIPE_REASONS.database);
    expect(result.tree).toBeUndefined();
  });

  it("rejects a tooling overlay without a JavaScript application", async () => {
    const result = await createVirtual({
      ecosystem: "php",
      phpWebFramework: "slim",
      stackParts: parseStackPartSpecs(["codeQuality:universal:biome"]),
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe(PHP_RECIPE_REASONS.capability);
    expect(result.tree).toBeUndefined();
  });

  it("accepts the same PHP selection in prompt, MCP create, and MCP update", () => {
    expect(resolvePhpWebFrameworkPrompt().initialValue).toBe("slim");
    expect(resolvePhpWebFrameworkPrompt("slim").autoValue).toBe("slim");
    expect(
      z.object(MCP_PLAN_CREATE_SCHEMA).parse({ ecosystem: "php", phpWebFramework: "slim" })
        .phpWebFramework,
    ).toBe("slim");
    expect(
      z
        .object(MCP_STACK_UPDATE_SCHEMA)
        .parse({ projectDir: "/tmp/php-service", phpWebFramework: "slim" }).phpWebFramework,
    ).toBe("slim");
  });
});
