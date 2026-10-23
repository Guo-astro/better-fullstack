import {
  getEcosystemDefaultStackSelection,
  createStackSelectionSearchParams,
  parseStackSelectionFromUrlRecord,
} from "@better-fullstack/types/stack-translation";
import { describe, expect, it } from "bun:test";

import { getComposerParts } from "@/components/stack-builder/stack-builder";
import { stackStateToProjectConfig } from "@/lib/builder/preview-config";
import { getStackRunSupport } from "@/lib/project/run-support";
import { ECOSYSTEMS, ECOSYSTEM_CATEGORIES, TECH_OPTIONS } from "@/lib/stack/constant";
import { parseStackShareSlug, getStackSharePath } from "@/lib/stack/stack-share-paths";

describe("Ruby builder projections", () => {
  it("keeps malformed saved bindings from throwing during composer rendering", () => {
    expect(getComposerParts(["backend:ruby"])).toEqual([]);
    expect(
      getComposerParts(["backend:ruby:sinatra:reports"]).find((part) => part.role === "backend")
        ?.id,
    ).toBe("reports");
  });

  it("opens the canonical Ruby share slug with native defaults and no frontend", () => {
    const stack = parseStackShareSlug("ruby");
    if (!stack) throw new Error("Ruby share slug was not recognized");
    expect(stack).toEqual(getEcosystemDefaultStackSelection("ruby"));
    expect(stack.webFrontend).toEqual([]);
    expect(stack.backend).toBe("none");
    expect(stack.database).toBe("none");
    expect(getStackSharePath(stack)).toBe("/ruby");
    expect(stackStateToProjectConfig(stack).frontend).toEqual([]);
  });

  it("offers the bounded native recipe and retains it through URL and preview config", () => {
    expect(ECOSYSTEMS.find((entry) => entry.id === "ruby")?.name).toBe("Ruby");
    expect(ECOSYSTEM_CATEGORIES.ruby).toContain("rubyWebFramework");
    expect(TECH_OPTIONS.rubyWebFramework.map((entry) => entry.id)).toEqual(["sinatra", "none"]);
    const selection = getEcosystemDefaultStackSelection("ruby");
    const restored = parseStackSelectionFromUrlRecord(
      Object.fromEntries(createStackSelectionSearchParams(selection)),
    );
    const config = stackStateToProjectConfig(restored);
    expect(config.ecosystem).toBe("ruby");
    expect(config.rubyWebFramework).toBe("sinatra");
    expect(config.backend).toBe("none");
    expect(config.database).toBe("none");
    expect(getStackRunSupport(restored)).toEqual({ supported: false, reason: "native-runtime" });
  });
});
