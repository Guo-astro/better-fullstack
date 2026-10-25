import type { ProjectConfig } from "@better-fullstack/types";

import type { VirtualFileSystem } from "@/core/virtual-fs";

import { renderTemplateTree, type TemplateData } from "@/template-handlers/core/utils";

export async function processPhpBaseTemplate(
  vfs: VirtualFileSystem,
  templates: TemplateData,
  config: ProjectConfig,
  targetPath = "",
): Promise<void> {
  if (config.ecosystem !== "php" || config.phpWebFramework !== "slim") return;
  const phpPackageName =
    config.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "app";
  const context = { ...config, phpPackageName };
  renderTemplateTree(vfs, templates, { prefix: "php-base/", targetPath, context });
}
