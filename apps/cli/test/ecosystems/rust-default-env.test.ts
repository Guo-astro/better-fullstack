import { describe, expect, it } from "bun:test";

import { createVirtual } from "@/index";
import { readVirtualFileContent as getFileContent } from "@test/support/virtual-tree-utils";

describe("Rust default database env", () => {
  it("writes a SeaORM SQLite URL for the default axum + SeaORM stack", async () => {
    const result = await createVirtual({
      projectName: "rust-default-env",
      ecosystem: "rust",
      rustWebFramework: "axum",
      rustOrm: "sea-orm",
      database: "sqlite",
    });

    expect(result.success).toBe(true);
    const envExample = getFileContent(result.tree!.root, ".env.example");
    expect(envExample).toContain("DATABASE_URL=sqlite://local.db?mode=rwc");
    expect(envExample).not.toContain("DATABASE_URL=file:");
  });
});
