import type { ProjectConfig } from "@better-fullstack/types";

import type { VirtualFileSystem } from "@/core/virtual-fs";

import { processTemplateString, transformFilename, isBinaryFile } from "@/core/template-processor";

export type TemplateData = Map<string, string>;

/**
 * Templates can legitimately produce no content when a feature is disabled.
 * Those files should not appear in generated trees. This stays at the template
 * boundary so processors can still create intentional empty markers directly.
 */
export function isEmptyTemplateOutput(templatePath: string, processedContent: string): boolean {
  return !isBinaryFile(templatePath) && processedContent.trim() === "";
}

export function hasTemplatesWithPrefix(templates: TemplateData, prefix: string): boolean {
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  for (const path of templates.keys()) {
    if (path.startsWith(normalizedPrefix)) return true;
  }
  return false;
}

export function processSingleTemplate(
  vfs: VirtualFileSystem,
  templates: TemplateData,
  templatePath: string,
  destPath: string,
  config: ProjectConfig,
): void {
  const templateKey = templatePath.endsWith(".hbs") ? templatePath : `${templatePath}.hbs`;
  const content = templates.get(templateKey);

  if (!content) return;

  let processedContent: string;
  if (isBinaryFile(templateKey)) {
    processedContent = "[Binary file]";
  } else if (templateKey.endsWith(".hbs")) {
    processedContent = processTemplateString(content, config);
  } else {
    processedContent = content;
  }

  if (isEmptyTemplateOutput(templateKey, processedContent)) return;

  // Pass original template path for binary files
  const sourcePath = isBinaryFile(templateKey) ? templateKey : undefined;
  vfs.writeFile(destPath, processedContent, sourcePath);
}

export function renderTemplateTree(
  vfs: VirtualFileSystem,
  templates: TemplateData,
  options: {
    prefix: string;
    targetPath?: string;
    context: ProjectConfig;
    skip?: (templatePath: string) => boolean;
    outputPath?: (relativePath: string) => string;
  },
): void {
  const { prefix, targetPath, context, skip, outputPath = transformFilename } = options;
  for (const [templatePath, content] of templates) {
    if (!templatePath.startsWith(prefix) || skip?.(templatePath)) continue;

    const relativeOutputPath = outputPath(templatePath.slice(prefix.length));
    const destPath = targetPath ? `${targetPath}/${relativeOutputPath}` : relativeOutputPath;
    const isBinary = isBinaryFile(templatePath);
    const processedContent = isBinary
      ? "[Binary file]"
      : templatePath.endsWith(".hbs")
        ? processTemplateString(content, context)
        : content;

    if (isEmptyTemplateOutput(templatePath, processedContent)) continue;

    vfs.writeFile(destPath, processedContent, isBinary ? templatePath : undefined);
  }
}

export function processTemplatesFromPrefix(
  vfs: VirtualFileSystem,
  templates: TemplateData,
  prefix: string,
  destPrefix: string,
  config: ProjectConfig,
  excludePrefixes: string[] = [],
): void {
  const normalizedExcludes = excludePrefixes.map((p) => (p.endsWith("/") ? p : `${p}/`));
  renderTemplateTree(vfs, templates, {
    prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
    targetPath: destPrefix,
    context: config,
    skip: (templatePath) => normalizedExcludes.some((exclude) => templatePath.startsWith(exclude)),
  });
}
