import {
  getVirtualTreeFileContent as content,
  listVirtualTreeFilePaths,
} from "@test/support/virtual-tree-utils";
import { afterAll, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

import {
  buildBtsConfigForPersistence,
  serializeBtsConfig,
  previewBtsConfigUpdate,
} from "@/config/bts-config";
import { validateFullConfig } from "@/config/config-validation";
import { create, createVirtual } from "@/index";
import { generateReproducibleCommand } from "@/lifecycle/generate-reproducible-command";
import { planProjectOperation } from "@/operations/project-create";
import {
  buildProjectConfig,
  getSchemaOptions,
  getInstallCommand,
  validateMcpProjectConfigCompatibility,
} from "@/operations/stack-helpers";
import { MCP_PLAN_CREATE_SCHEMA, MCP_STACK_UPDATE_SCHEMA } from "@/operations/stack-input";
import { runWithContext } from "@/presentation/context";
import { CLIError } from "@/presentation/errors";
import { gatherConfig } from "@/prompts/core/config-prompts";
import { resolveRubyWebFrameworkPrompt } from "@/prompts/ecosystems/ruby-ecosystem";
import {
  ProjectConfigSchema,
  getEcosystemDefaultStackSelection,
  stackSelectionToProjectConfig,
  parseStackPartSpecs,
  RUBY_RECIPE_EXTENSION_REASON,
  type ProjectConfig,
} from "@/types";

const config = () =>
  stackSelectionToProjectConfig(getEcosystemDefaultStackSelection("ruby"), {
    projectDir: "/virtual",
    relativePath: "ruby-service",
    install: false,
  });
const temporaryDirectories: string[] = [];
afterAll(async () => {
  await Promise.all(temporaryDirectories.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("Ruby language integration", () => {
  it.each([
    { mobilePush: "expo-notifications" },
    { mobileLibraries: ["expo-camera"] },
  ] satisfies Partial<ProjectConfig>[])(
    "rejects mobile integrations instead of returning a partial Ruby project %j",
    async (mobile) => {
      const result = await createVirtual({ ecosystem: "ruby", ...mobile });
      expect(result.success).toBe(false);
      expect(result.error).toBe(RUBY_RECIPE_EXTENSION_REASON);
      expect(result.tree).toBeUndefined();
    },
  );

  it("uses the CLI error contract when normalized Ruby validation fails", () => {
    runWithContext({ silent: true }, () => {
      expect(() => validateFullConfig({ ...config(), database: "sqlite" }, new Set(), {})).toThrow(
        CLIError,
      );
    });
  });

  it("keeps every generated frontend in the Ruby CORS allowlist", async () => {
    const result = await createVirtual({
      stackParts: parseStackPartSpecs([
        "frontend:typescript:react-vite",
        "frontend:dotnet:blazor-webassembly",
        "backend:ruby:sinatra",
      ]),
      aiDocs: ["none"],
    });
    if (!result.success || !result.tree) throw new Error(result.error ?? "No Ruby graph");
    expect(content(result.tree, "apps/server/http_policy.rb")).toContain(
      "http://localhost:5173,http://localhost:5174",
    );
  });

  it("rejects invalid Ruby input before overwriting an existing directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "bfs-ruby-overwrite-"));
    temporaryDirectories.push(root);
    const destination = join(root, "service");
    await mkdir(destination);
    await writeFile(join(destination, "keep.txt"), "preserve me");
    const result = await create(destination, {
      ecosystem: "ruby",
      rubyWebFramework: "sinatra",
      database: "sqlite",
      directoryConflict: "overwrite",
      install: false,
      git: false,
      aiDocs: ["none"],
      packageManager: "bun",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain(RUBY_RECIPE_EXTENSION_REASON);
    expect(await readFile(join(destination, "keep.txt"), "utf8")).toBe("preserve me");
  });

  it("offers only a runnable standalone framework while composer can disable the backend", () => {
    expect(resolveRubyWebFrameworkPrompt().options.map((option) => option.value)).toEqual([
      "sinatra",
      "rails",
      "roda",
      "grape",
    ]);
    expect(
      resolveRubyWebFrameworkPrompt(undefined, true).options.map((option) => option.value),
    ).toEqual(["sinatra", "rails", "roda", "grape", "none"]);
  });

  it("plans a Bundler-owned native service through the actual MCP operation", async () => {
    const result = await planProjectOperation.invoke({
      projectName: "ruby-mcp",
      ecosystem: "ruby",
      rubyWebFramework: "sinatra",
    });
    expect(result.failed).toBe(false);
    expect(result.output.files).toContain("Gemfile");
    expect(result.output.files).toContain("app.rb");
    expect(result.output.files).not.toContain("package.json");
    expect(result.output.stackPartSpecs).toContain("backend:ruby:sinatra");
  });

  it("rejects tooling-only overlays on a flat Ruby service before generation", async () => {
    const result = await createVirtual({
      ecosystem: "ruby",
      rubyWebFramework: "sinatra",
      stackParts: parseStackPartSpecs(["codeQuality:universal:biome"]),
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe(RUBY_RECIPE_EXTENSION_REASON);
    expect(result.tree).toBeUndefined();
    await expect(
      planProjectOperation.invoke({
        ecosystem: "ruby",
        rubyWebFramework: "sinatra",
        part: ["codeQuality:universal:biome"],
      }),
    ).rejects.toThrow(RUBY_RECIPE_EXTENSION_REASON);
  });

  it("rejects a Ruby-only database through virtual generation and the actual MCP plan", async () => {
    const specs = ["backend:ruby:sinatra", "database:universal:sqlite"];
    const result = await createVirtual({ stackParts: parseStackPartSpecs(specs) });
    expect(result.success).toBe(false);
    expect(result.error).toContain(RUBY_RECIPE_EXTENSION_REASON);
    expect(result.tree).toBeUndefined();
    await expect(
      planProjectOperation.invoke({ projectName: "ruby-mcp", part: specs }),
    ).rejects.toThrow(RUBY_RECIPE_EXTENSION_REASON);
  });

  it("resolves an explicit Ruby prompt flow to a valid complete config without TypeScript choices", async () => {
    const gathered = await gatherConfig(
      {
        ecosystem: "ruby",
        rubyWebFramework: "sinatra",
        git: false,
        install: false,
        aiDocs: ["none"],
        packageManager: "bun",
      },
      "ruby-service",
      "/virtual",
      "ruby-service",
    );
    const parsed = ProjectConfigSchema.parse({ ...gathered, versionChannel: "stable" });
    expect(parsed.rubyWebFramework).toBe("sinatra");
    expect(parsed.javaLanguage).toBe("java");
    expect(parsed.backend).toBe("none");
    expect(parsed.database).toBe("none");
    expect(parsed.frontend).toEqual([]);
  });

  it("emits an entirely native standalone service and preserves its authored README", async () => {
    const result = await createVirtual({
      ecosystem: "ruby",
      projectName: "ruby-service",
      rubyWebFramework: "sinatra",
      aiDocs: ["agents-md"],
    });
    if (!result.success || !result.tree) throw new Error(result.error ?? "No Ruby project");
    const paths = listVirtualTreeFilePaths(result.tree);
    for (const path of [
      "Gemfile",
      "app.rb",
      "config.ru",
      "Rakefile",
      "bin/server",
      "bin/proof",
      "test/app_test.rb",
      "README.md",
      "AGENTS.md",
      ".env.example",
    ])
      expect(paths).toContain(path);
    expect(
      paths.some((path) => path.endsWith("package.json") || path.endsWith("tsconfig.json")),
    ).toBe(false);
    expect(content(result.tree, "README.md")).toContain("bundle exec ruby bin/server");
    expect(content(result.tree, "README.md")).toContain("bundle exec ruby bin/proof");
    expect(content(result.tree, "README.md")).not.toContain("bun run dev");
    expect(content(result.tree, "Gemfile")).toContain('gem "sinatra", "4.2.1"');
    expect(content(result.tree, "AGENTS.md")).toContain("bundle exec rake test");
  });

  it.each([
    { framework: "rails", gem: 'gem "railties", "8.1.4"', app: "class Application < Rails::Application" },
    { framework: "roda", gem: 'gem "roda", "3.109.0"', app: "class App < Roda" },
    { framework: "grape", gem: 'gem "grape", "4.0.1"', app: "class Api < Grape::API" },
  ] as const)("emits the $framework app behind the shared Rack policy", async ({ framework, gem, app }) => {
    const result = await createVirtual({
      ecosystem: "ruby",
      projectName: "ruby-service",
      rubyWebFramework: framework,
      aiDocs: ["none"],
    });
    if (!result.success || !result.tree) throw new Error(result.error ?? "No Ruby project");
    const gemfile = content(result.tree, "Gemfile");
    expect(gemfile).toContain(gem);
    expect(gemfile).not.toContain('gem "sinatra"');
    expect(content(result.tree, "app.rb")).toContain(app);
    expect(content(result.tree, "app.rb")).toContain("HttpPolicy");
    expect(content(result.tree, "test/app_test.rb")).toContain(`"service" => "${framework}"`);
    expect(content(result.tree, "bin/proof")).toContain(`"service" => "${framework}"`);
    expect(listVirtualTreeFilePaths(result.tree).some((path) => path.startsWith("web/"))).toBe(
      false,
    );
    expect(generateReproducibleCommand({ ...config(), rubyWebFramework: framework })).toContain(
      `--ruby-web-framework ${framework}`,
    );
  });

  it("round-trips persistence and updates without retaining inactive Ruby defaults", () => {
    const project = config();
    const metadata = { version: "test", createdAt: "2026-10-22T00:00:00.000Z" };
    const persisted = buildBtsConfigForPersistence(project, metadata);
    expect(persisted.rubyWebFramework).toBe("sinatra");
    expect(serializeBtsConfig(project, metadata)).toContain('"rubyWebFramework": "sinatra"');
    expect(generateReproducibleCommand(project)).toContain("--ruby-web-framework sinatra");
    const updated = previewBtsConfigUpdate(persisted, { addons: [] });
    expect(updated.rubyWebFramework).toBe("sinatra");
    expect(updated.stackParts?.find((part) => part.role === "backend")?.toolId).toBe("sinatra");
    const typescript = buildBtsConfigForPersistence(
      {
        ...project,
        ecosystem: "typescript",
        stackParts: parseStackPartSpecs(["backend:typescript:hono"]),
      },
      metadata,
    );
    expect(typescript.rubyWebFramework).toBe("none");
  });

  it("shares the schema and native install command with MCP and prompts", () => {
    expect(getSchemaOptions("rubyWebFramework", "ruby")).toEqual({
      category: "rubyWebFramework",
      options: ["sinatra", "rails", "roda", "grape", "none"],
    });
    expect(
      z.object(MCP_PLAN_CREATE_SCHEMA).parse({ ecosystem: "ruby", rubyWebFramework: "sinatra" })
        .rubyWebFramework,
    ).toBe("sinatra");
    expect(
      z
        .object(MCP_STACK_UPDATE_SCHEMA)
        .parse({ projectDir: "/virtual", rubyWebFramework: "sinatra" }).rubyWebFramework,
    ).toBe("sinatra");
    const mcpConfig = buildProjectConfig({ ecosystem: "ruby", rubyWebFramework: "sinatra" });
    expect(mcpConfig.backend).toBe("none");
    expect(mcpConfig.rubyWebFramework).toBe("sinatra");
    expect(() => validateMcpProjectConfigCompatibility(mcpConfig)).not.toThrow();
    expect(getInstallCommand("ruby", "app")).toBe("cd app && bundle install");
    expect(resolveRubyWebFrameworkPrompt("sinatra").autoValue).toBe("sinatra");
  });

  it("rejects unsupported selections instead of emitting partial integrations", async () => {
    const result = await createVirtual({
      ecosystem: "ruby",
      rubyWebFramework: "sinatra",
      database: "sqlite",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe(RUBY_RECIPE_EXTENSION_REASON);
    const graph = await createVirtual({
      stackParts: parseStackPartSpecs([
        "backend:ruby:sinatra",
        "backend.auth:typescript:better-auth",
      ]),
    });
    expect(graph.success).toBe(false);
    expect(graph.error).toBe(RUBY_RECIPE_EXTENSION_REASON);
  });

  it("preserves SQLite generation for an unrelated TypeScript service alongside Ruby", async () => {
    const parts = parseStackPartSpecs([
      "backend:ruby:sinatra:ruby-api",
      "backend:typescript:hono:data-api",
      "data-api.orm:typescript:drizzle",
      "database:universal:sqlite",
    ]);
    const ruby = parts.find((part) => part.id === "ruby-api");
    if (!ruby) throw new Error("Missing Ruby backend");
    ruby.targetPath = "services/ruby";
    const result = await createVirtual({ stackParts: parts });
    if (!result.success || !result.tree) throw new Error(result.error ?? "No mixed project");
    const databaseManifest = content(result.tree, "packages/db/package.json");
    if (!databaseManifest) throw new Error("Missing TypeScript database manifest");
    const databasePackage = z
      .object({
        dependencies: z.record(z.string(), z.string()),
        scripts: z.record(z.string(), z.string()),
      })
      .parse(JSON.parse(databaseManifest));
    expect(databasePackage.dependencies["drizzle-orm"]).toBeDefined();
    expect(databasePackage.dependencies["@libsql/client"]).toBeDefined();
    expect(databasePackage.scripts["db:push"]).toBe("drizzle-kit push");
    expect(content(result.tree, "services/ruby/Gemfile")).toContain('gem "sinatra", "4.2.1"');
    expect(listVirtualTreeFilePaths(result.tree)).not.toContain("services/ruby/package.json");
  });

  it("preserves SQLite generation for an unrelated Go service alongside Ruby", async () => {
    const parts = parseStackPartSpecs([
      "backend:ruby:sinatra:ruby-api",
      "backend:go:gin:data-api",
      "data-api.orm:go:gorm",
      "database:universal:sqlite",
    ]);
    for (const part of parts) {
      if (part.id === "ruby-api") part.targetPath = "services/ruby";
      if (part.id === "data-api") part.targetPath = "services/data";
    }
    const result = await createVirtual({ stackParts: parts });
    if (!result.success || !result.tree) throw new Error(result.error ?? "No mixed project");
    expect(content(result.tree, "services/data/internal/database/database.go")).toContain(
      'sqlite.Open("app.db")',
    );
    expect(content(result.tree, "services/ruby/Gemfile")).toContain('gem "sinatra", "4.2.1"');
    expect(listVirtualTreeFilePaths(result.tree)).not.toContain(
      "services/ruby/internal/database/database.go",
    );
  });

  it("keeps repeated Ruby manifests native and allocates distinct launch ports", async () => {
    const parts = parseStackPartSpecs([
      "frontend:typescript:react-vite",
      "frontend.css:typescript:tailwind",
      "backend:ruby:sinatra:api",
      "backend:ruby:rails:admin",
    ]);
    const api = parts.find((part) => part.id === "api");
    const admin = parts.find((part) => part.id === "admin");
    if (!api || !admin) throw new Error("Named services were not preserved");
    api.targetPath = "services/api";
    admin.targetPath = "services/admin";
    const result = await createVirtual({ stackParts: parts });
    if (!result.success || !result.tree) throw new Error(result.error ?? "No composed project");
    const paths = listVirtualTreeFilePaths(result.tree);
    expect(paths).toContain("services/api/Gemfile");
    expect(paths).toContain("services/admin/Gemfile");
    expect(paths).not.toContain("services/api/package.json");
    expect(paths).not.toContain("services/admin/package.json");
    expect(content(result.tree, "services/api/.env.example")).toContain("PORT=4567");
    expect(content(result.tree, "services/admin/.env.example")).toContain("PORT=4568");
    expect(content(result.tree, "services/api/http_policy.rb")).toContain("http://localhost:5173");
    expect(content(result.tree, "services/admin/README.md")).toContain(
      "bundle exec ruby bin/server",
    );
    expect(content(result.tree, "services/api/Gemfile")).toContain('gem "sinatra", "4.2.1"');
    expect(content(result.tree, "services/admin/Gemfile")).toContain('gem "railties", "8.1.4"');
    expect(content(result.tree, "services/admin/app.rb")).toContain("Rails::Application");
  });
});
