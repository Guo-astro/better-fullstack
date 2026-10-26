import type { ProjectConfig } from "@better-fullstack/types";
import type { VirtualFileSystem } from "@/core/virtual-fs";
import { renderTemplateTree, type TemplateData } from "@/template-handlers/core/utils";

const FRAMEWORK_TEMPLATE_DIRECTORIES: Record<ProjectConfig["crystalWebFramework"], string[]> = {
  kemal: ["kemal"],
  lucky: ["http", "request", "http-guard", "lucky"],
  athena: ["http", "request", "http-guard", "athena"],
  marten: ["http", "request", "marten"],
  none: [],
};

export async function processCrystalBaseTemplate(vfs: VirtualFileSystem, templates: TemplateData, config: ProjectConfig, targetPath = "") {
  const shardName = `app_${config.projectName.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
  const context = { ...config, shardName };
  const frameworkDirectories = FRAMEWORK_TEMPLATE_DIRECTORIES[config.crystalWebFramework];
  const directories = [
    ...frameworkDirectories.map((directory) => `frameworks/${directory}`),
    ...(config.crystalOrm === "none" ? [] : [`orm/${config.crystalOrm}`]),
    ...(config.crystalOrm !== "none" && !frameworkDirectories.includes("request") ? ["frameworks/request"] : []),
  ];
  renderTemplateTree(vfs, templates, {
    prefix: "crystal-base/",
    targetPath,
    context,
    skip: (templatePath) => templatePath.startsWith("crystal-base/frameworks/") || templatePath.startsWith("crystal-base/orm/"),
  });
  for (const directory of directories) {
    renderTemplateTree(vfs, templates, { prefix: `crystal-base/${directory}/`, targetPath, context });
  }
}
