import type { ProjectConfig } from "@/config/types";

export const PHP_RECIPE_REASONS = {
  framework:
    "The PHP recipe requires Slim. Use --php-web-framework slim or select another ecosystem.",
  database:
    "The Slim recipe does not generate database or migration integration. Use --database none.",
  capability:
    "The Slim recipe provides REST, Composer and PHPUnit; additional backend capabilities are not implemented.",
  owner: "PHP capabilities must belong to a PHP Slim backend.",
} as const;

export const PHP_UNSUPPORTED_BACKEND_FIELDS = [
  "auth",
  "orm",
  "api",
  "email",
  "caching",
  "search",
  "observability",
  "jobQueue",
  "realtime",
  "payments",
  "serverDeploy",
  "dbSetup",
  "integrations",
  "vectorDb",
  "fileStorage",
  "fileUpload",
  "logging",
  "ai",
  "featureFlags",
  "rateLimit",
  "botProtection",
  "ecommerce",
] as const;

export function getPhpRecipeIssue(config: Partial<ProjectConfig>): string | undefined {
  if (
    config.ecosystem !== "php" ||
    config.stackParts?.some(
      (part) =>
        !part.ownerPartId && ["frontend", "backend", "mobile", "database"].includes(part.role),
    )
  )
    return undefined;
  if (config.phpWebFramework === "none") return PHP_RECIPE_REASONS.framework;
  if (config.stackParts?.some((part) => part.source !== "provided"))
    return PHP_RECIPE_REASONS.capability;
  if (config.database && config.database !== "none") return PHP_RECIPE_REASONS.database;
  for (const key of PHP_UNSUPPORTED_BACKEND_FIELDS) {
    if (config[key] && config[key] !== "none") return PHP_RECIPE_REASONS.capability;
  }
  if (
    config.addons?.some((addon) => addon !== "none") ||
    config.examples?.some((example) => example !== "none")
  )
    return PHP_RECIPE_REASONS.capability;
  return undefined;
}
