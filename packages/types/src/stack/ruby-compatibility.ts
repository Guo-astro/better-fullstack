import type { ProjectConfig, StackPart } from "@/config/types";

import { getToolingCapability, isToolingOverlayOnly } from "@/capabilities/tooling-capabilities";

export const RUBY_RECIPE_EXTENSION_REASON =
  "The experimental Ruby recipe provides Sinatra JSON HTTP and Minitest/Rack tests only. Database, authentication, deployment, and other service adapters are not generated.";
export const RUBY_RECIPE_FRAMEWORK_REASON =
  "The Ruby HTTP recipe requires Sinatra. Use rubyWebFramework=sinatra or remove the Ruby backend.";

export const RUBY_UNSUPPORTED_CONFIG_KEYS = [
  "database",
  "dbSetup",
  "orm",
  "auth",
  "api",
  "backend",
  "runtime",
  "payments",
  "email",
  "fileUpload",
  "logging",
  "observability",
  "featureFlags",
  "integrations",
  "ecommerce",
  "analytics",
  "webMcp",
  "ai",
  "stateManagement",
  "forms",
  "testing",
  "validation",
  "realtime",
  "jobQueue",
  "animation",
  "cms",
  "caching",
  "rateLimit",
  "botProtection",
  "i18n",
  "search",
  "vectorDb",
  "fileStorage",
  "webDeploy",
  "serverDeploy",
  "cssFramework",
  "uiLibrary",
  "effect",
  "mobileNavigation",
  "mobileUI",
  "mobileStorage",
  "mobileTesting",
  "mobilePush",
  "mobileOTA",
  "mobileDeepLinking",
  "mobileLibraries",
  "frontend",
  "addons",
  "examples",
] as const satisfies readonly (keyof ProjectConfig)[];

export function getRubyDatabaseSelectionIssue(
  parts: readonly (Pick<StackPart, "role" | "ecosystem" | "toolId"> &
    Partial<Pick<StackPart, "source">>)[],
): string | null {
  const backends = parts.filter((part) => part.role === "backend" && part.toolId !== "none");
  const hasRubyBackend = backends.some(
    (part) => part.ecosystem === "ruby" && part.source !== "provided",
  );
  const hasOtherBackend = backends.some(
    (part) => part.ecosystem !== "ruby" && part.ecosystem !== "php",
  );
  const hasSelectedDatabase = parts.some(
    (part) => part.role === "database" && part.toolId !== "none" && part.source !== "provided",
  );
  return hasRubyBackend && !hasOtherBackend && hasSelectedDatabase
    ? RUBY_RECIPE_EXTENSION_REASON
    : null;
}

export function getRubyRecipeIssue(config: Partial<ProjectConfig>): string | null {
  if (config.stackParts?.length && !isToolingOverlayOnly(config.stackParts)) {
    const databaseIssue = getRubyDatabaseSelectionIssue(config.stackParts);
    if (databaseIssue) return databaseIssue;
    const rubyBackends = config.stackParts.filter(
      (part) => part.role === "backend" && part.ecosystem === "ruby" && part.source !== "provided",
    );
    const rubyIds = new Set(rubyBackends.map((part) => part.id));
    if (rubyBackends.some((part) => part.toolId !== "sinatra")) return RUBY_RECIPE_FRAMEWORK_REASON;
    if (
      config.stackParts.some(
        (part) =>
          part.source !== "provided" &&
          ((part.ownerPartId && rubyIds.has(part.ownerPartId)) ||
            (part.ecosystem === "ruby" && part.role !== "backend")),
      )
    )
      return RUBY_RECIPE_EXTENSION_REASON;
    const hasJavaScriptApplication = config.stackParts.some(
      (part) =>
        !part.ownerPartId &&
        part.toolId !== "none" &&
        ["frontend", "backend", "mobile"].includes(part.role) &&
        ["typescript", "react-native"].includes(part.ecosystem) &&
        part.source !== "provided",
    );
    if (
      rubyBackends.length > 0 &&
      !hasJavaScriptApplication &&
      config.stackParts.some(
        (part) => part.source !== "provided" && getToolingCapability(part.toolId),
      )
    )
      return RUBY_RECIPE_EXTENSION_REASON;
    return null;
  }
  if (config.ecosystem !== "ruby") return null;
  if (config.stackParts?.some((part) => part.source !== "provided"))
    return RUBY_RECIPE_EXTENSION_REASON;
  if (config.rubyWebFramework === "none") return RUBY_RECIPE_FRAMEWORK_REASON;
  for (const key of RUBY_UNSUPPORTED_CONFIG_KEYS) {
    const value = config[key];
    if (
      Array.isArray(value)
        ? value.some((entry) => entry !== "none")
        : value !== undefined && value !== "none"
    )
      return RUBY_RECIPE_EXTENSION_REASON;
  }
  return null;
}

export function createRubyProjectConfigDefaults(): Partial<ProjectConfig> {
  return Object.fromEntries(
    RUBY_UNSUPPORTED_CONFIG_KEYS.map((key) => [
      key,
      ["frontend", "addons", "examples", "mobileLibraries"].includes(key) ? [] : "none",
    ]).concat([["rubyWebFramework", "sinatra"]]),
  );
}
