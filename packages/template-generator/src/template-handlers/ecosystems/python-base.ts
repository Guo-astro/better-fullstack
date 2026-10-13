import type { ProjectConfig } from "@better-fullstack/types";

import type { VirtualFileSystem } from "@/core/virtual-fs";

import { renderTemplateTree, type TemplateData } from "@/template-handlers/core/utils";

export async function processPythonBaseTemplate(
  vfs: VirtualFileSystem,
  templates: TemplateData,
  config: ProjectConfig,
  targetPath = "",
): Promise<void> {
  // Only process Python templates if ecosystem is "python"
  if (config.ecosystem !== "python") return;

  const prefix = "python-base/";
  const templateContext: ProjectConfig = {
    ...config,
    // Graph-derived and legacy configs may omit this recently introduced field.
    // Python projects still use uv by default, matching CLI commands and docs.
    pythonPackageManager: config.pythonPackageManager ?? "uv",
    pythonLogging: config.pythonLogging ?? "none",
  };

  renderTemplateTree(vfs, templates, {
    prefix,
    targetPath,
    context: templateContext,
  });
}
