import type { ProjectConfig } from "@better-fullstack/types";
import type { VirtualFileSystem } from "@/core/virtual-fs";
import { getGraphBackendConnections } from "@/graph/graph-backend";
import { renderTemplateTree, type TemplateData } from "@/template-handlers/core/utils";

export async function processRubyBaseTemplate(vfs: VirtualFileSystem, templates: TemplateData, config: ProjectConfig, targetPath = ""): Promise<void> {
  if (config.ecosystem !== "ruby") return;
  const connection = getGraphBackendConnections(config).find((entry) => entry.ecosystem === "ruby" && (entry.targetPath === targetPath || (targetPath === "" && entry.targetPath === ".")));
  const context = { ...config, rubyPort: connection ? new URL(connection.serverUrl).port : "4567", rubyWebOrigin: connection?.webOrigin ?? "http://localhost:3001" };
  renderTemplateTree(vfs, templates, { prefix: "ruby-base/", targetPath, context });
}
