import type { ProjectConfig } from "@better-fullstack/types";

import type { VirtualFileSystem } from "@/core/virtual-fs";

import { renderTemplateTree, type TemplateData } from "@/template-handlers/core/utils";

export async function processGoBaseTemplate(
  vfs: VirtualFileSystem,
  templates: TemplateData,
  config: ProjectConfig,
  targetPath = "",
): Promise<void> {
  // Only process Go templates if ecosystem is "go"
  if (config.ecosystem !== "go") return;

  const prefix = "go-base/";
  const hasGrpc = config.goApi === "grpc-go";
  const hasGrpcGateway = config.goApi === "grpc-gateway";
  const hasProto = hasGrpc || hasGrpcGateway || config.goProtoTooling === "buf";
  const hasCobra = config.goCli === "cobra";
  const hasUrfaveCli = config.goCli === "urfave-cli";
  const hasBubbletea = config.goCli === "bubbletea";

  renderTemplateTree(vfs, templates, {
    prefix,
    targetPath,
    context: config,
    skip: (templatePath) => {
      // Skip proto directory if gRPC is not selected
      if (!hasProto && templatePath.includes("proto/")) return true;
      if (
        !hasGrpc &&
        !hasGrpcGateway &&
        templatePath.includes("proto/greeter") &&
        templatePath.endsWith(".go.hbs")
      )
        return true;

      if (!hasGrpcGateway && templatePath.includes("cmd/gateway/")) return true;
      if (config.goApi !== "connect-go" && templatePath.includes("cmd/connect/")) return true;
      if (config.goApi !== "oapi-codegen" && templatePath.includes("cmd/openapi/")) return true;
      if (
        !["go-zero", "kratos", "httprouter"].includes(config.goWebFramework) &&
        templatePath.includes("internal/server/")
      ) {
        return true;
      }

      // Skip cmd/cli directory if no CLI framework using that entrypoint is selected
      if (!hasCobra && !hasUrfaveCli && templatePath.includes("cmd/cli/")) return true;

      // Skip cmd/tui directory if Bubble Tea is not selected
      if (!hasBubbletea && templatePath.includes("cmd/tui/")) return true;
      return false;
    },
  });
}
