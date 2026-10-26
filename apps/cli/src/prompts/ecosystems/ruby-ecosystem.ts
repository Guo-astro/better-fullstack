import type { RubyWebFramework } from "@/types";

import { exitCancelled } from "@/presentation/errors";
import { isCancel, navigableSelect } from "@/prompts/core/navigable";
import { createStaticSinglePromptResolution } from "@/prompts/core/prompt-contract";

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
