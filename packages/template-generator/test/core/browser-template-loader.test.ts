import { cliInputToProjectConfigPartial, createRubyProjectConfigDefaults, RUBY_RECIPE_EXTENSION_REASON } from "@better-fullstack/types";
import { makeConfig } from "@test/_fixtures/config-factory";
import { describe, expect, it } from "bun:test";

import type { ProjectConfig } from "@better-fullstack/types";

import { getRequiredTemplateFamilies, loadTemplatesForConfig } from "@/browser-template-loader";
import { generateVirtualProject } from "@/generator";
import { EMBEDDED_TEMPLATES } from "@/templates.generated";
import type { VirtualNode } from "@/types";

function flattenFiles(node: VirtualNode): [string, string][] {
  if (node.type === "file") return [[node.path, node.content]];
  return node.children.flatMap(flattenFiles);
}

async function generatedFiles(config: ProjectConfig, templates: Map<string, string>) {
  const result = await generateVirtualProject({ config, templates });
  expect(result.success, result.error).toBe(true);
  if (!result.tree) throw new Error(result.error);
  return flattenFiles(result.tree.root).sort(([left], [right]) => left.localeCompare(right));
}

function graphConfig(parts: string[]): ProjectConfig {
  return makeConfig({
    ...cliInputToProjectConfigPartial({ part: parts }),
    addons: [],
    examples: [],
    install: false,
  });
}

describe("browser template family loader", () => {
  it("loads the native Ruby family with the same complete output as the eager map", async () => {
    const config = makeConfig({
      ...createRubyProjectConfigDefaults(),
      ecosystem: "ruby",
      rubyWebFramework: "sinatra",
      aiDocs: ["agents-md"],
      install: false,
    });
    const selectedTemplates = await loadTemplatesForConfig(config);
    expect(getRequiredTemplateFamilies(config)).toContain("ruby-base");
    expect(selectedTemplates.size).toBeLessThan(EMBEDDED_TEMPLATES.size);
    const files = await generatedFiles(config, selectedTemplates);
    expect(files).toEqual(await generatedFiles(config, EMBEDDED_TEMPLATES));
    const contents = new Map(files);
    expect(contents.get("Gemfile")).toContain('gem "sinatra", "4.2.1"');
    expect(contents.get("app.rb")).toContain('post "/api/greetings"');
    expect(contents.get("README.md")).toContain("bundle exec ruby bin/proof");
    expect(contents.get(".ruby-version")).toBe("3.4.11\n");
    expect(contents.has("package.json")).toBe(false);
  });

  it("preserves custom Ruby paths and ports with selected and eager mixed-family loading", async () => {
    const config = graphConfig([
      "frontend:typescript:react-vite",
      "backend:ruby:sinatra:public-api",
      "backend:ruby:sinatra:private-api",
    ]);
    for (const part of config.stackParts ?? []) {
      if (part.id === "public-api") part.targetPath = "services/public";
      if (part.id === "private-api") part.targetPath = "services/private";
    }
    const selectedTemplates = await loadTemplatesForConfig(config);
    const files = await generatedFiles(config, selectedTemplates);
    expect(files).toEqual(await generatedFiles(config, EMBEDDED_TEMPLATES));
    const contents = new Map(files);
    expect(contents.get("services/public/Gemfile")).toContain('gem "sinatra", "4.2.1"');
    expect(contents.get("services/private/Gemfile")).toContain('gem "sinatra", "4.2.1"');
    expect(contents.get("services/public/.env.example")).toContain("PORT=4567");
    expect(contents.get("services/private/.env.example")).toContain("PORT=4568");
    expect(contents.has("services/public/package.json")).toBe(false);
    expect(contents.has("services/private/package.json")).toBe(false);
  });

  it("rejects a Ruby-only database before either browser or eager rendering", async () => {
    const config = graphConfig(["backend:ruby:sinatra", "database:universal:sqlite"]);
    const selectedTemplates = await loadTemplatesForConfig(config);
    for (const templates of [selectedTemplates, EMBEDDED_TEMPLATES]) {
      const result = await generateVirtualProject({ config, templates });
      expect(result.success).toBe(false);
      expect(result.error).toBe(RUBY_RECIPE_EXTENSION_REASON);
      expect(result.tree).toBeUndefined();
    }
  });

  it("loads a strict subset for a default TypeScript project with eager-equivalent output", async () => {
    const config = makeConfig({ auth: "none" });
    const selectedTemplates = await loadTemplatesForConfig(config);

    expect(selectedTemplates.size).toBeLessThan(EMBEDDED_TEMPLATES.size);
    expect(await generatedFiles(config, selectedTemplates)).toEqual(
      await generatedFiles(config, EMBEDDED_TEMPLATES),
    );
  });

  it("uses every ecosystem in a mixed stack graph and preserves the complete tree", async () => {
    const config = graphConfig([
      "frontend:typescript:react-vite",
      "backend:go:gin:api",
      "backend:python:fastapi:worker",
    ]);
    const requiredFamilies = getRequiredTemplateFamilies(config);
    const selectedTemplates = await loadTemplatesForConfig(config);

    expect(requiredFamilies).toContain("frontend");
    expect(requiredFamilies).toContain("go-base");
    expect(requiredFamilies).toContain("python-base");
    expect(await generatedFiles(config, selectedTemplates)).toEqual(
      await generatedFiles(config, EMBEDDED_TEMPLATES),
    );
  });

  it("loads kotlin-ktor templates for a Java stack that selects Ktor", async () => {
    const config = graphConfig(["backend:java:ktor"]);
    const requiredFamilies = getRequiredTemplateFamilies(config);
    const selectedTemplates = await loadTemplatesForConfig(config);

    expect(requiredFamilies).toContain("java-base");
    expect(requiredFamilies).toContain("kotlin-ktor");
    const files = await generatedFiles(config, selectedTemplates);
    expect(await generatedFiles(config, EMBEDDED_TEMPLATES)).toEqual(files);
    expect(files.some(([path]) => path.includes("Application.kt"))).toBe(true);
  });

  it("keeps graph-global add-on templates for native and mixed ecosystem graphs", async () => {
    for (const parts of [
      ["backend:go:gin"],
      ["frontend:typescript:react-vite", "backend:go:gin"],
    ]) {
      const config = {
        ...graphConfig(parts),
        ecosystem: "go" as const,
        addons: ["docker-compose", "devcontainer"] as ProjectConfig["addons"],
      };
      const requiredFamilies = getRequiredTemplateFamilies(config);
      const selectedTemplates = await loadTemplatesForConfig(config);

      expect(requiredFamilies).toContain("addons");
      expect(await generatedFiles(config, selectedTemplates)).toEqual(
        await generatedFiles(config, EMBEDDED_TEMPLATES),
      );
    }
  });

  it("loads graph-native frontend and backend families without a JavaScript root", async () => {
    const config = graphConfig([
      "frontend:dotnet:blazor-webassembly",
      "backend:rust:axum",
      "backend:go:gin",
    ]);
    const requiredFamilies = getRequiredTemplateFamilies(config);
    const selectedTemplates = await loadTemplatesForConfig(config);

    expect(requiredFamilies).toContain("frontend");
    expect(requiredFamilies).toContain("dotnet-base");
    expect(requiredFamilies).toContain("rust-base");
    expect(requiredFamilies).toContain("go-base");
    expect(await generatedFiles(config, selectedTemplates)).toEqual(
      await generatedFiles(config, EMBEDDED_TEMPLATES),
    );
  });
});
