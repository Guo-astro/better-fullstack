import { describe, expect, it } from "bun:test";

import { createCliDefaultProjectConfigBase } from "@/config/defaults";
import { CreateInputSchema, EcosystemSchema } from "@/config/schemas";
import { getPhpRecipeIssue, PHP_RECIPE_REASONS } from "@/stack/php-compatibility";
import {
  legacyProjectConfigToStackParts,
  parseStackPartSpecs,
  stackPartsToLegacyProjectConfigPartial,
  validateStackParts,
} from "@/stack/stack-graph";
import {
  DEFAULT_STACK_SELECTION,
  cliInputToProjectConfigPartial,
  createStackSelectionSearchParams,
  generateStackSelectionCommand,
  parseStackSelectionFromUrlRecord,
} from "@/stack/stack-translation";

const native = {
  ...createCliDefaultProjectConfigBase(),
  ecosystem: "php" as const,
  phpWebFramework: "slim" as const,
  database: "none" as const,
  backend: "none" as const,
  orm: "none" as const,
  api: "none" as const,
  auth: "none" as const,
  frontend: [],
  addons: [],
};

describe("PHP graph and transport contract", () => {
  it("accepts PHP and Slim in the shared create schema", () => {
    expect(EcosystemSchema.parse("php")).toBe("php");
    expect(
      CreateInputSchema.parse({ ecosystem: "php", phpWebFramework: "slim" }).phpWebFramework,
    ).toBe("slim");
    expect(
      CreateInputSchema.safeParse({ ecosystem: "php", phpWebFramework: "laravel" }).success,
    ).toBe(false);
  });

  it("lifts and lowers Slim with owned native capabilities", () => {
    const parts = legacyProjectConfigToStackParts(native);
    const backend = parts.find((part) => part.role === "backend");
    expect(backend?.ecosystem).toBe("php");
    expect(
      parts
        .filter((part) => part.source === "provided")
        .map((part) => [part.role, part.toolId, part.ownerPartId]),
    ).toEqual(
      expect.arrayContaining([
        ["api", "rest", backend?.id],
        ["testing", "phpunit", backend?.id],
        ["packageManager", "composer", backend?.id],
      ]),
    );
    expect(validateStackParts(parts).issues).toEqual([]);
    expect(stackPartsToLegacyProjectConfigPartial(parts)).toMatchObject({
      ecosystem: "php",
      phpWebFramework: "slim",
      database: "none",
    });
  });

  it("preserves named repeated services and unrelated frontend settings", () => {
    const config = cliInputToProjectConfigPartial({
      part: [
        "frontend:typescript:react-vite",
        "frontend.css:typescript:tailwind",
        "frontend.ui:typescript:shadcn-ui",
        "backend:php:slim:catalog",
        "backend:php:slim:billing",
      ],
      shadcnStyle: "luma",
    });
    const parts = config.stackParts ?? [];
    expect(validateStackParts(parts).issues).toEqual([]);
    expect(parts.filter((part) => part.role === "backend").map((part) => part.targetPath)).toEqual([
      "services/catalog",
      "services/billing",
    ]);
    expect(parts.find((part) => part.role === "ui")?.settings?.shadcnStyle).toBe("luma");
    const owners = new Set(parts.filter((part) => part.role === "backend").map((part) => part.id));
    expect(
      parts
        .filter((part) => part.source === "provided")
        .every((part) => owners.has(part.ownerPartId ?? "")),
    ).toBe(true);
    expect(new Set(parts.map((part) => part.id)).size).toBe(parts.length);
  });

  it("rejects unimplemented data and backend integrations with shared reasons", () => {
    expect(getPhpRecipeIssue({ ...native, database: "sqlite" })).toBe(PHP_RECIPE_REASONS.database);
    expect(getPhpRecipeIssue({ ...native, phpWebFramework: "none" })).toBe(
      PHP_RECIPE_REASONS.framework,
    );
    expect(getPhpRecipeIssue({ ...native, email: "resend" })).toBe(PHP_RECIPE_REASONS.capability);
    expect(getPhpRecipeIssue({ ...native, logging: "pino" })).toBe(PHP_RECIPE_REASONS.capability);
    expect(getPhpRecipeIssue({ ...native, ai: "mastra" })).toBe(PHP_RECIPE_REASONS.capability);
    expect(getPhpRecipeIssue({ ...native, addons: ["docker"] })).toBe(
      PHP_RECIPE_REASONS.capability,
    );
    const parts = parseStackPartSpecs(["backend:php:slim", "database:universal:sqlite"]);
    expect(
      validateStackParts(parts).issues.some(
        (issue) => issue.message === PHP_RECIPE_REASONS.database,
      ),
    ).toBe(true);
  });

  it("round-trips PHP URL and replay selections", () => {
    const selection = {
      ...DEFAULT_STACK_SELECTION,
      ecosystem: "php" as const,
      phpWebFramework: "slim",
      database: "none",
      git: "false",
      install: "false",
    };
    const params = createStackSelectionSearchParams(selection, { includeDefaults: true });
    expect(params.get("phwf")).toBe("slim");
    expect(parseStackSelectionFromUrlRecord(Object.fromEntries(params.entries()))).toEqual(
      selection,
    );
    const command = generateStackSelectionCommand(selection);
    expect(command).toContain("--ecosystem php --php-web-framework slim --database none");
    expect(command).toContain("--no-install");
  });
});
