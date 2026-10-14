import { describe, expect, mock, test } from "bun:test";

import * as navigable from "@/prompts/core/navigable";

const realNavigable = { ...navigable };
const offered = new Map<string, unknown[]>();

mock.module("@/prompts/core/navigable", () => ({
  ...realNavigable,
  navigableSelect: <T>(opts: navigable.NavigableSelectOptions<T>) => {
    offered.set(
      opts.message,
      opts.options.map((option) => option.value),
    );
    return realNavigable.navigableSelect(opts);
  },
}));

describe("Rust ORM prompt with a disabled backend", () => {
  test("does not default to SeaORM when no Rust web framework is selected", async () => {
    const { gatherConfig } = await import("@/prompts/core/config-prompts");
    const { runWithContextAsync } = await import("@/presentation/context");
    const { processAndValidateFlags } = await import("@/validation");

    const flags = processAndValidateFlags(
      { ecosystem: "rust", rustWebFramework: "none", rustFrontend: "leptos" },
      new Set(["ecosystem", "rustWebFramework", "rustFrontend"]),
      "rust-frontend-app",
    );

    const config = await runWithContextAsync({ silent: true }, () =>
      gatherConfig(flags, "rust-frontend-app", "/virtual/rust-frontend-app", "rust-frontend-app"),
    );

    expect(config.rustWebFramework).toBe("none");
    expect(config.rustOrm).toBe("none");
    expect(offered.has("Select Rust ORM/database layer")).toBe(false);
  });
});
