import type { StackPart } from "@/config/types";

export const BROWSER_EXTENSION_TOOLS = ["wxt", "plasmo"] as const;

export function isBrowserExtension(toolId: string): toolId is (typeof BROWSER_EXTENSION_TOOLS)[number] {
  return BROWSER_EXTENSION_TOOLS.some((extension) => extension === toolId);
}

type ExtensionSelection = {
  addons?: readonly string[];
  ecosystem?: string;
  workspaceShape?: string;
  stackParts?: readonly StackPart[];
};

export function getSelectedBrowserExtensions(selection: ExtensionSelection) {
  const toolIds = selection.stackParts?.length
    ? selection.stackParts.filter((part) => part.source !== "provided" && part.role === "appPlatform").map((part) => part.toolId)
    : selection.addons ?? [];
  return [...new Set(toolIds.filter(isBrowserExtension))];
}

export function getBrowserExtensionSelectionIssue(toolIds: readonly string[], workspaceShape?: string): string | null {
  const extensions = [...new Set(toolIds.filter(isBrowserExtension))];
  if (extensions.length > 1) return "WXT and Plasmo both generate apps/extension. Choose one browser extension platform.";
  if (extensions.length > 0 && workspaceShape === "single-app") return "Browser extensions require a monorepo layout for apps/extension.";
  return null;
}

export function getBrowserExtensionRecipeIssue(selection: ExtensionSelection): string | null {
  const extensions = getSelectedBrowserExtensions(selection);
  const issue = getBrowserExtensionSelectionIssue(extensions, selection.workspaceShape);
  if (issue || extensions.length === 0) return issue;
  if (!selection.stackParts?.length) {
    if (selection.ecosystem && !["typescript", "react-native"].includes(selection.ecosystem)) {
      return "Browser extensions require a generated JavaScript application workspace.";
    }
    return null;
  }
  for (const part of selection.stackParts) {
    if (part.source === "provided" || part.role !== "appPlatform" || !isBrowserExtension(part.toolId)) continue;
    if (part.ownerPartId) return "Browser extension app platforms must remain ownerless.";
    if (part.targetPath && part.targetPath !== "apps/extension") return "Browser extension app platforms require the apps/extension target.";
  }
  return null;
}
