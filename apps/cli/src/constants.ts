import { createCliDefaultProjectConfigBase } from "@better-fullstack/types";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Frontend, UILibrary } from "@/types";

import { getUserPkgManager } from "@/platform/get-package-manager";

// Re-export from template-generator (single source of truth).
// Type-only: the value lives in the heavy template-generator bundle and must
// be imported dynamically at point of use to keep CLI startup fast.
export type { AvailableDependencies } from "@better-fullstack/template-generator";

const __filename = fileURLToPath(import.meta.url);
const distPath = path.dirname(__filename);
export const PKG_ROOT = path.join(distPath, "../");
export const BUILDER_URL = "https://better-fullstack.dev/new";

export const DEFAULT_CONFIG_BASE = createCliDefaultProjectConfigBase(getUserPkgManager());

export function getDefaultConfig() {
  return {
    ...DEFAULT_CONFIG_BASE,
    projectDir: path.resolve(process.cwd(), DEFAULT_CONFIG_BASE.projectName),
    packageManager: getUserPkgManager(),
    frontend: [...DEFAULT_CONFIG_BASE.frontend],
    addons: [...DEFAULT_CONFIG_BASE.addons],
    examples: [...DEFAULT_CONFIG_BASE.examples],
    rustLibraries: [...DEFAULT_CONFIG_BASE.rustLibraries],
    pythonAi: [...DEFAULT_CONFIG_BASE.pythonAi],
    javaLibraries: [...DEFAULT_CONFIG_BASE.javaLibraries],
    javaTestingLibraries: [...DEFAULT_CONFIG_BASE.javaTestingLibraries],
    mobileLibraries: [...DEFAULT_CONFIG_BASE.mobileLibraries],
    dotnetLibraries: [...DEFAULT_CONFIG_BASE.dotnetLibraries],
    aiDocs: [...DEFAULT_CONFIG_BASE.aiDocs],
  };
}

export const DEFAULT_CONFIG = getDefaultConfig();

/**
 * Default UI library for each frontend framework
 * Falls back based on what's compatible
 */
export const DEFAULT_UI_LIBRARY_BY_FRONTEND: Record<Frontend, UILibrary> = {
  "tanstack-router": "shadcn-ui",
  "react-router": "shadcn-ui",
  "react-vite": "shadcn-ui",
  "vanilla-vite": "none",
  vue: "none",
  "tanstack-start": "shadcn-ui",
  next: "shadcn-ui",
  vinext: "shadcn-ui",
  nuxt: "daisyui",
  svelte: "daisyui",
  solid: "daisyui",
  "solid-start": "daisyui",
  "tanstack-start-solid": "none",
  astro: "daisyui",
  qwik: "daisyui",
  angular: "daisyui",
  redwood: "daisyui",
  fresh: "daisyui",
  "native-bare": "none",
  "native-uniwind": "none",
  "native-unistyles": "none",
  none: "none",
} as const;
