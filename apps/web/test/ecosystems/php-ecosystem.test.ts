import { describe, expect, it } from "bun:test";

import { getDisabledReason } from "@/components/stack-builder/utils";
import { stackStateToProjectConfig } from "@/lib/builder/preview-config";
import { DEFAULT_STACK, ECOSYSTEMS, TECH_OPTIONS } from "@/lib/stack/constant";
import { generateStackCommand } from "@/lib/stack/stack-utils";

describe("PHP builder recipe", () => {
  it("uses the shared Slim selection for preview and CLI", () => {
    const stack = {
      ...DEFAULT_STACK,
      ecosystem: "php" as const,
      phpWebFramework: "slim",
      database: "none",
      backend: "none",
      orm: "none",
      api: "none",
      auth: "none",
      webFrontend: ["none"],
      appPlatforms: [],
      codeQuality: [],
      documentation: [],
    };
    expect(ECOSYSTEMS.some((ecosystem) => ecosystem.id === "php")).toBe(true);
    expect(TECH_OPTIONS.phpWebFramework.some((option) => option.id === "slim")).toBe(true);
    expect(stackStateToProjectConfig(stack)).toMatchObject({
      ecosystem: "php",
      phpWebFramework: "slim",
      database: "none",
    });
    expect(generateStackCommand(stack)).toContain("--php-web-framework slim");
    expect(getDisabledReason(stack, "database", "sqlite")).toContain("does not generate database");
  });
});
