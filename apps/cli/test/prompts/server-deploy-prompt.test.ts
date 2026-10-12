import { describe, expect, it } from "bun:test";

import { getServerDeploymentOptions } from "@/prompts/services/server-deploy";

describe("server deployment prompt", () => {
  it("offers only deployment profiles that generate a required worker", () => {
    for (const jobQueue of ["pg-boss", "hatchet"] as const) {
      expect(getServerDeploymentOptions("bun", jobQueue).map((option) => option.value)).toEqual([
        "none",
        "docker",
      ]);
    }
  });
  it("does not offer Netlify unless the runtime is Node", async () => {
    expect(getServerDeploymentOptions("bun").map((option) => option.value)).not.toContain(
      "netlify",
    );

    expect(getServerDeploymentOptions("node").map((option) => option.value)).toContain("netlify");
  });
});
