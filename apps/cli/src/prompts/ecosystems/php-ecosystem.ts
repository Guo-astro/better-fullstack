import type { PhpWebFramework } from "@/types";

import { exitCancelled } from "@/presentation/errors";
import { isCancel, navigableSelect } from "@/prompts/core/navigable";
import {
  createStaticSinglePromptResolution,
  type PromptOption,
} from "@/prompts/core/prompt-contract";

const OPTIONS: PromptOption<PhpWebFramework>[] = [
  {
    value: "slim",
    label: "Slim",
    hint: "Experimental JSON HTTP application, Composer and PHPUnit",
  },
  { value: "none", label: "None", hint: "No PHP service" },
];

export function resolvePhpWebFrameworkPrompt(value?: PhpWebFramework) {
  return createStaticSinglePromptResolution(OPTIONS, "slim", value);
}

export async function getPhpWebFrameworkChoice(value?: PhpWebFramework) {
  const resolution = resolvePhpWebFrameworkPrompt(value);
  if (!resolution.shouldPrompt) return resolution.autoValue ?? "slim";
  const response = await navigableSelect<PhpWebFramework>({
    message: "Select PHP web framework",
    options: resolution.options,
    initialValue: resolution.initialValue,
  });
  return isCancel(response) ? exitCancelled("Operation cancelled") : response;
}
