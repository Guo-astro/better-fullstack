import { describe, expect, it } from "bun:test";

import type { ProjectConfig } from "@/config/types";

import { getCapabilityInventory } from "@/capabilities/capability-inventory";
import { getCliFlagReference } from "@/catalog/cli-flags";
import { createCliDefaultProjectConfigBase } from "@/config/defaults";
import { EcosystemSchema, CreateInputSchema, ProjectConfigSchema } from "@/config/schemas";
import { getDisabledReason } from "@/stack/compatibility";
import {
  createRubyProjectConfigDefaults,
  getRubyRecipeIssue,
  RUBY_RECIPE_EXTENSION_REASON,
} from "@/stack/ruby-compatibility";
import {
  getStackPartOptions,
  legacyProjectConfigToStackParts,
  stackPartsToLegacyProjectConfigPartial,
  parseStackPartSpecs,
  validateStackParts,
  formatStackPartSpec,
} from "@/stack/stack-graph";
import {
  cliInputToProjectConfigPartial,
  getEcosystemDefaultStackSelection,
  createStackSelectionSearchParams,
  parseStackSelectionFromUrlRecord,
  stackSelectionToProjectConfig,
  generateStackSelectionCommand,
} from "@/stack/stack-translation";

const rubySelection = () => getEcosystemDefaultStackSelection("ruby");

describe("Ruby recipe contracts", () => {
  it.each([
    ["codeQuality", "gitleaks"],
    ["documentation", "starlight"],
    ["appPlatforms", "turborepo"],
  ] as const)("rejects %s tooling through the same Ruby addon policy", (category, tool) => {
    expect(getDisabledReason(rubySelection(), category, tool)).toBe(RUBY_RECIPE_EXTENSION_REASON);
    expect(getDisabledReason(rubySelection(), category, "none")).toBeNull();
  });

  it.each([
    { mobileNavigation: "expo-router" },
    { mobileUI: "tamagui" },
    { mobileStorage: "mmkv" },
    { mobileTesting: "maestro" },
    { mobilePush: "expo-notifications" },
    { mobileOTA: "expo-updates" },
    { mobileDeepLinking: "expo-linking" },
    { mobileLibraries: ["expo-camera"] },
  ] satisfies Partial<ProjectConfig>[])(
    "rejects unsupported flat mobile selections %j",
    (mobile) => {
      expect(getRubyRecipeIssue({ ecosystem: "ruby", ...mobile })).toBe(
        RUBY_RECIPE_EXTENSION_REASON,
      );
    },
  );

  it("keeps disabled mobile defaults valid and preserves mobile owners in mixed graphs", () => {
    expect(createRubyProjectConfigDefaults().mobileLibraries).toEqual([]);
    expect(
      getRubyRecipeIssue({
        ...createRubyProjectConfigDefaults(),
        ecosystem: "ruby",
        mobileLibraries: ["none"],
      }),
    ).toBeNull();
    const parts = parseStackPartSpecs([
      "backend:ruby:sinatra",
      "mobile:react-native:native-bare",
      "mobile.push:react-native:expo-notifications",
      "mobile.libraries:react-native:expo-camera",
    ]);
    expect(getRubyRecipeIssue({ stackParts: parts })).toBeNull();
    expect(validateStackParts(parts).issues).toEqual([]);
  });

  it.each(["latest", "beta"] as const)(
    "preserves the %s channel in Ruby command replay",
    (versionChannel) => {
      expect(generateStackSelectionCommand({ ...rubySelection(), versionChannel })).toContain(
        `--version-channel ${versionChannel}`,
      );
    },
  );

  it("rejects tooling beside a disabled JavaScript frontend", () => {
    const parts = parseStackPartSpecs([
      "backend:ruby:sinatra",
      "frontend:typescript:none",
      "codeQuality:universal:biome",
    ]);
    expect(getRubyRecipeIssue({ stackParts: parts })).toBe(RUBY_RECIPE_EXTENSION_REASON);
  });

  it("continues reading pre-Ruby project configs", () => {
    const { rubyWebFramework: _rubyWebFramework, ...legacy } = createCliDefaultProjectConfigBase();
    const parsed = ProjectConfigSchema.parse({ ...legacy, projectDir: "/virtual" });
    expect(parsed.ecosystem).toBe("typescript");
    expect(parsed.backend).toBe("hono");
  });

  it("accepts the same field through create, CLI flags, and persisted graph projection", () => {
    expect(EcosystemSchema.parse("ruby")).toBe("ruby");
    const input = CreateInputSchema.parse({ ecosystem: "ruby", rubyWebFramework: "sinatra" });
    const config = cliInputToProjectConfigPartial(input);
    expect(getRubyRecipeIssue(config)).toBeNull();
    const parts = legacyProjectConfigToStackParts(config);
    expect(parts.filter((part) => part.role === "backend").map((part) => part.toolId)).toEqual([
      "sinatra",
    ]);
    expect(stackPartsToLegacyProjectConfigPartial(parts).rubyWebFramework).toBe("sinatra");
    const flags = getCliFlagReference().flatMap((group) => group.flags);
    expect(flags.find((flag) => flag.flag === "--ruby-web-framework")?.values).toEqual([
      "sinatra",
      "rails",
      "roda",
      "grape",
      "none",
    ]);
  });

  it("keeps a minimal Ruby share URL native and replays its explicit command", () => {
    const selection = parseStackSelectionFromUrlRecord({ eco: "ruby" });
    expect(selection.rubyWebFramework).toBe("sinatra");
    expect(selection.backend).toBe("none");
    expect(selection.webFrontend).toEqual([]);
    const config = stackSelectionToProjectConfig(selection, {
      projectDir: "/virtual",
      relativePath: "ruby-service",
      install: false,
    });
    expect(getRubyRecipeIssue(config)).toBeNull();
    const params = createStackSelectionSearchParams(selection);
    expect(parseStackSelectionFromUrlRecord(Object.fromEntries(params))).toEqual(selection);
    const command = generateStackSelectionCommand(selection);
    expect(command).toContain("--ecosystem ruby");
    expect(command).toContain("--ruby-web-framework sinatra");
    expect(command).toContain("--addons none");
  });

  it("preserves named Ruby services and TypeScript capabilities through graph replay", () => {
    const parts = parseStackPartSpecs([
      "frontend:typescript:react-vite",
      "frontend.css:typescript:tailwind",
      "backend:ruby:sinatra:public-api",
      "backend:ruby:sinatra:internal-api",
      "backend:go:gin:go-api",
      "go-api.orm:go:gorm",
      "database:universal:sqlite",
    ]);
    expect(validateStackParts(parts).issues).toEqual([]);
    expect(getRubyRecipeIssue({ stackParts: parts })).toBeNull();
    const replay = parseStackPartSpecs(
      parts
        .filter((part) => part.source !== "provided")
        .map((part) => formatStackPartSpec(part, parts)),
    );
    expect(replay.map((part) => [part.id, part.ownerPartId, part.toolId])).toEqual(
      parts.map((part) => [part.id, part.ownerPartId, part.toolId]),
    );
    const lowered = stackPartsToLegacyProjectConfigPartial(parts);
    expect(lowered.rubyWebFramework).toBe("sinatra");
    expect(lowered.goOrm).toBe("gorm");
    expect(lowered.cssFramework).toBe("tailwind");
  });

  it("rejects unsupported Ruby extensions through flat and graph boundaries with a shared reason", () => {
    expect(
      getRubyRecipeIssue({
        ...createRubyProjectConfigDefaults(),
        ecosystem: "ruby",
        database: "sqlite",
      }),
    ).toBe(RUBY_RECIPE_EXTENSION_REASON);
    expect(getDisabledReason(rubySelection(), "database", "sqlite")).toBe(
      RUBY_RECIPE_EXTENSION_REASON,
    );
    const invalidSelection = { ...rubySelection(), database: "sqlite" };
    expect(() =>
      stackSelectionToProjectConfig(invalidSelection, {
        projectDir: "/virtual",
        relativePath: "ruby-service",
      }),
    ).toThrow(RUBY_RECIPE_EXTENSION_REASON);
    expect(() => generateStackSelectionCommand(invalidSelection)).toThrow(
      RUBY_RECIPE_EXTENSION_REASON,
    );
    expect(getDisabledReason(rubySelection(), "auth", "better-auth")).toBe(
      RUBY_RECIPE_EXTENSION_REASON,
    );
    expect(
      getRubyRecipeIssue({
        stackParts: parseStackPartSpecs([
          "backend:ruby:sinatra",
          "continuousIntegration:universal:github-actions",
        ]),
      }),
    ).toBe(RUBY_RECIPE_EXTENSION_REASON);
    const parts = parseStackPartSpecs(["backend:ruby:sinatra", "backend.orm:typescript:drizzle"]);
    expect(getRubyRecipeIssue({ stackParts: parts })).toBe(RUBY_RECIPE_EXTENSION_REASON);
    expect(
      validateStackParts(parts).issues.some(
        (issue) => issue.message === RUBY_RECIPE_EXTENSION_REASON,
      ),
    ).toBe(true);
  });

  it("rejects selected databases when Ruby is the only backend, in either picker order", () => {
    const ruby = parseStackPartSpecs(["backend:ruby:sinatra:api"]);
    const database = parseStackPartSpecs(["database:universal:sqlite"]);
    expect(
      getStackPartOptions({ role: "database", ecosystem: "universal", parts: ruby }),
    ).not.toContain("sqlite");
    expect(
      getStackPartOptions({ role: "backend", ecosystem: "ruby", parts: database }),
    ).not.toContain("sinatra");
    for (const specs of [
      ["backend:ruby:sinatra", "database:universal:sqlite"],
      ["database:universal:sqlite", "backend:ruby:sinatra"],
      ["frontend:typescript:react-vite", "backend:ruby:sinatra", "database:universal:sqlite"],
      ["backend:ruby:sinatra:api", "backend:ruby:sinatra:admin", "database:universal:postgres"],
    ]) {
      const parts = parseStackPartSpecs(specs);
      expect(getRubyRecipeIssue({ stackParts: parts })).toBe(RUBY_RECIPE_EXTENSION_REASON);
      expect(
        validateStackParts(parts).issues.some(
          (issue) => issue.message === RUBY_RECIPE_EXTENSION_REASON,
        ),
      ).toBe(true);
    }
  });

  it("requires a database-capable backend alongside Ruby and PHP", () => {
    for (const backends of [
      ["backend:ruby:sinatra:ruby-api", "backend:php:slim:php-api"],
      ["backend:php:slim:php-api", "backend:ruby:sinatra:ruby-api"],
    ]) {
      const parts = parseStackPartSpecs(backends);
      expect(
        getStackPartOptions({ role: "database", ecosystem: "universal", parts }),
      ).not.toContain("sqlite");
      const unsupported = parseStackPartSpecs([...backends, "database:universal:sqlite"]);
      expect(getRubyRecipeIssue({ stackParts: unsupported })).toBe(RUBY_RECIPE_EXTENSION_REASON);
      expect(validateStackParts(unsupported).issues.length).toBeGreaterThan(0);
      const supported = parseStackPartSpecs([
        ...backends,
        "backend:go:gin:data-api",
        "data-api.orm:go:gorm",
        "database:universal:sqlite",
      ]);
      expect(getRubyRecipeIssue({ stackParts: supported })).toBeNull();
      expect(validateStackParts(supported).issues).toEqual([]);
      expect(
        getStackPartOptions({ role: "database", ecosystem: "universal", parts: supported }),
      ).toContain("sqlite");
    }
  });

  it("rejects Ruby graph overlays during builder replay before generic tooling filtering", () => {
    const selection = {
      ...rubySelection(),
      stackMode: "multi" as const,
      stackPartSpecs: ["backend:ruby:sinatra", "codeQuality:universal:biome"],
    };
    expect(() =>
      stackSelectionToProjectConfig(selection, {
        projectDir: "/virtual",
        relativePath: "ruby-service",
      }),
    ).toThrow(RUBY_RECIPE_EXTENSION_REASON);
    expect(() => generateStackSelectionCommand(selection)).toThrow(RUBY_RECIPE_EXTENSION_REASON);
  });

  it("retains database choices for unrelated Go and TypeScript backends", () => {
    for (const [backend, orm] of [
      ["go:gin", "go:gorm"],
      ["typescript:hono", "typescript:drizzle"],
    ]) {
      const parts = parseStackPartSpecs([
        "backend:ruby:sinatra:ruby-api",
        `backend:${backend}:data-api`,
        `data-api.orm:${orm}`,
        "database:universal:sqlite",
      ]);
      expect(getRubyRecipeIssue({ stackParts: parts })).toBeNull();
      expect(validateStackParts(parts).issues).toEqual([]);
      expect(getStackPartOptions({ role: "database", ecosystem: "universal", parts })).toContain(
        "sqlite",
      );
      expect(stackPartsToLegacyProjectConfigPartial(parts).database).toBe("sqlite");
      expect(parts.find((part) => part.role === "orm")?.ownerPartId).toBe("data-api");
    }
    const standaloneGo = parseStackPartSpecs([
      "backend:go:gin",
      "backend.orm:go:gorm",
      "database:universal:sqlite",
    ]);
    expect(getRubyRecipeIssue({ stackParts: standaloneGo })).toBeNull();
    expect(validateStackParts(standaloneGo).issues).toEqual([]);
  });

  it("does not raise evidence from source availability", () => {
    const records = getCapabilityInventory().filter(
      (record) => record.ecosystem === "ruby" && record.optionId === "sinatra",
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.evidenceLevel).toBe("listed");
    expect(records[0]?.maturity).toBe("experimental");
  });
});
