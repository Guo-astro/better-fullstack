import type { ProjectConfig } from "@better-fullstack/types";
import type { VirtualFileSystem } from "@/core/virtual-fs";
import { renderTemplateTree, type TemplateData } from "@/template-handlers/core/utils";

const FRAMEWORK_TEMPLATE_DIRECTORIES: Record<ProjectConfig["crystalWebFramework"], string[]> = {
  kemal: ["kemal"],
  lucky: ["http", "http-guard", "lucky"],
  athena: ["http", "http-guard", "athena"],
  marten: ["http", "marten"],
  none: [],
};

export async function processCrystalBaseTemplate(vfs: VirtualFileSystem, templates: TemplateData, config: ProjectConfig, targetPath = "") {
  const shardName = `app_${config.projectName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
  const context = { ...config, shardName, hasKemal: config.crystalWebFramework === "kemal" };
  renderTemplateTree(vfs, templates, {
    prefix: "crystal-base/",
    targetPath,
    context,
    skip: (templatePath) => templatePath.startsWith("crystal-base/frameworks/"),
  });
  for (const directory of FRAMEWORK_TEMPLATE_DIRECTORIES[config.crystalWebFramework]) {
    renderTemplateTree(vfs, templates, { prefix: `crystal-base/frameworks/${directory}/`, targetPath, context });
  }
}
