import { beforeEach, describe, expect, it, mock } from "bun:test";

const boxed: string[] = [];

const fakeConsola = {
  box: (message: string) => {
    boxed.push(message);
  },
};

mock.module("consola", () => ({
  consola: fakeConsola,
  default: fakeConsola,
}));

const { displayPostInstallInstructions } = await import("@/helpers/core/post-installation");

type InstructionsConfig = Parameters<typeof displayPostInstallInstructions>[0];

function rustConfig(rustOrm: string): InstructionsConfig {
  return {
    ecosystem: "rust",
    relativePath: "my-rust-app",
    depsInstalled: false,
    rustWebFramework: "axum",
    rustFrontend: "none",
    rustOrm,
    rustApi: "none",
    rustCli: "none",
  } as InstructionsConfig;
}

const ANSI_CODES = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const plain = (text: string) => text.replace(ANSI_CODES, "");

describe("Rust post-install instructions", () => {
  beforeEach(() => {
    boxed.length = 0;
  });

  it("copies the env template before running a SeaORM server", async () => {
    await displayPostInstallInstructions(rustConfig("sea-orm"));

    const output = plain(boxed.join("\n"));
    expect(output).toContain("cp .env.example .env");
    expect(output.indexOf("cp .env.example .env")).toBeLessThan(output.indexOf("cargo run"));
  });

  it("skips the env step when the server needs no DATABASE_URL", async () => {
    await displayPostInstallInstructions(rustConfig("none"));

    expect(plain(boxed.join("\n"))).not.toContain("cp .env.example .env");
  });
});
