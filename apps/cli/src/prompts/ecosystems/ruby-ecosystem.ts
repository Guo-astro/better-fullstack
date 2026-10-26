import type { RubyAuth, RubyOrm, RubyWebFramework } from "@/types";

import { exitCancelled } from "@/presentation/errors";
import { isCancel, navigableSelect } from "@/prompts/core/navigable";
import {
  createStaticSinglePromptResolution,
  type PromptOption,
} from "@/prompts/core/prompt-contract";

export function resolveRubyWebFrameworkPrompt(value?: RubyWebFramework, allowNone = false) {
  return createStaticSinglePromptResolution(
    [
      {
        value: "sinatra" as const,
        label: "Sinatra",
        hint: "Experimental JSON HTTP service with Puma and Minitest",
      },
      { value: "rails" as const, label: "Rails", hint: "API-only Rails application on Puma" },
      { value: "roda" as const, label: "Roda", hint: "Routing-tree Rack framework" },
      { value: "grape" as const, label: "Grape", hint: "REST API framework on Rack" },
      ...(allowNone
        ? [{ value: "none" as const, label: "None", hint: "Disable the Ruby backend" }]
        : []),
    ],
    "sinatra",
    value,
  );
}

export async function getRubyWebFrameworkChoice(value?: RubyWebFramework) {
  const resolution = resolveRubyWebFrameworkPrompt(value);
  if (!resolution.shouldPrompt) return resolution.autoValue ?? "sinatra";
  const response = await navigableSelect<RubyWebFramework>({
    message: "Select Ruby web framework",
    options: resolution.options,
    initialValue: resolution.initialValue,
  });
  if (isCancel(response)) return exitCancelled("Operation cancelled");
  return response;
}

const ORM_OPTIONS: PromptOption<RubyOrm>[] = [
  { value: "active-record", label: "Active Record", hint: "Rails ORM with versioned migrations" },
  { value: "sequel", label: "Sequel", hint: "Database toolkit and models with its migrator" },
  { value: "rom", label: "ROM", hint: "Data mapper with relations and repositories" },
  { value: "none", label: "None", hint: "No database layer" },
];

export const resolveRubyOrmPrompt = (value?: RubyOrm) =>
  createStaticSinglePromptResolution(ORM_OPTIONS, "none", value);

export async function getRubyOrmChoice(value?: RubyOrm) {
  const resolution = resolveRubyOrmPrompt(value);
  if (!resolution.shouldPrompt) return resolution.autoValue ?? "none";
  const response = await navigableSelect<RubyOrm>({
    message: "Select Ruby database layer (SQLite)",
    options: resolution.options,
    initialValue: resolution.initialValue,
  });
  if (isCancel(response)) return exitCancelled("Operation cancelled");
  return response;
}

const AUTH_OPTIONS: PromptOption<RubyAuth>[] = [
  { value: "jwt", label: "JWT (ruby-jwt)", hint: "Verify HS256 bearer tokens on API routes" },
  { value: "omniauth", label: "OmniAuth OIDC", hint: "OpenID Connect sign-in with a cookie session" },
  { value: "rodauth", label: "Rodauth", hint: "Accounts, login, and logout stored in SQLite" },
  { value: "none", label: "None", hint: "No authentication" },
];

export const resolveRubyAuthPrompt = (value?: RubyAuth) =>
  createStaticSinglePromptResolution(AUTH_OPTIONS, "none", value);

export async function getRubyAuthChoice(value?: RubyAuth) {
  const resolution = resolveRubyAuthPrompt(value);
  if (!resolution.shouldPrompt) return resolution.autoValue ?? "none";
  const response = await navigableSelect<RubyAuth>({
    message: "Select Ruby authentication",
    options: resolution.options,
    initialValue: resolution.initialValue,
  });
  if (isCancel(response)) return exitCancelled("Operation cancelled");
  return response;
}
