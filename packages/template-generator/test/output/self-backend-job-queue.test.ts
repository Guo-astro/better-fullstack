import { makeConfig } from "@test/_fixtures/config-factory";
import { describe, expect, it } from "bun:test";

import type { VirtualNode } from "@/types";

import { generateVirtualProject } from "@/generator";
import { EMBEDDED_TEMPLATES } from "@/templates.generated";

function files(node: VirtualNode): Record<string, string> {
  if (node.type === "file") return { [node.path]: node.content };
  return Object.assign({}, ...node.children.map(files));
}

describe("job queues on full-stack frameworks", () => {
  it.each(["next", "tanstack-start", "nuxt", "svelte", "solid-start", "astro"] as const)(
    "puts pg-boss code, dependency, and worker scripts in the %s app",
    async (frontend) => {
      const result = await generateVirtualProject({
        config: makeConfig({
          frontend: [frontend],
          backend: "self",
          runtime: "none",
          database: "postgres",
          orm: "drizzle",
          jobQueue: "pg-boss",
          packageManager: "pnpm",
        }),
        templates: EMBEDDED_TEMPLATES,
      });
      if (!result.tree) throw new Error(result.error);
      const output = files(result.tree.root);
      const webPackage = JSON.parse(output["apps/web/package.json"] ?? "{}");

      expect(Object.keys(output)).toEqual(
        expect.arrayContaining([
          "apps/web/src/jobs/queue.ts",
          "apps/web/src/jobs/worker.ts",
          "apps/web/src/jobs/enqueue.ts",
        ]),
      );
      expect(webPackage.dependencies["pg-boss"]).toBeDefined();
      expect(webPackage.devDependencies.tsx).toBeDefined();
      expect(webPackage.scripts["jobs:worker"]).toBe("tsx src/jobs/worker.ts");
    },
  );
});
