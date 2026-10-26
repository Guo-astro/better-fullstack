import type { CrystalOrm, CrystalWebFramework } from "@/types";
import { CrystalOrmSchema, CrystalWebFrameworkSchema, getCrystalOptionIssue } from "@/types";
import { exitCancelled } from "@/presentation/errors";
import { isCancel, navigableSelect } from "@/prompts/core/navigable";
import { createStaticSinglePromptResolution } from "@/prompts/core/prompt-contract";

export function resolveCrystalWebFrameworkPrompt(value?: string) {
  const selected = value === undefined ? undefined : CrystalWebFrameworkSchema.parse(value);
  return createStaticSinglePromptResolution(
    [
    { value: "kemal" as const, label: "Kemal", hint: "Experimental native HTTP service" },
    { value: "lucky" as const, label: "Lucky", hint: "Type-safe actions without a database" },
    { value: "athena" as const, label: "Athena", hint: "Annotation-based controllers" },
    { value: "marten" as const, label: "Marten", hint: "Handlers and middleware without a database" },
    { value: "none" as const, label: "None" },
    ],
    "kemal",
    selected,
  );
}

export async function getCrystalWebFrameworkChoice(value?: CrystalWebFramework) {
  const resolution = resolveCrystalWebFrameworkPrompt(value);
  if (!resolution.shouldPrompt) return resolution.autoValue ?? "kemal";
  const response = await navigableSelect<CrystalWebFramework>({ message: "Select Crystal HTTP framework", options: resolution.options, initialValue: resolution.initialValue });
  if (isCancel(response)) return exitCancelled("Operation cancelled");
  return response;
}

export function resolveCrystalOrmPrompt(value?: string, framework?: string) {
  const selected = value === undefined ? undefined : CrystalOrmSchema.parse(value);
  const options = [
    { value: "crystal-db" as const, label: "crystal-db (SQLite)", hint: "Parameterized SQL with any HTTP framework" },
    { value: "avram" as const, label: "Avram (PostgreSQL)", hint: "Lucky's type-safe ORM and migrations" },
    { value: "marten-orm" as const, label: "Marten ORM (SQLite)", hint: "Marten models and migrations" },
    { value: "none" as const, label: "None" },
  ].filter((option) => !getCrystalOptionIssue("crystalOrm", option.value, framework));
  return createStaticSinglePromptResolution(options, "none", selected);
}

export async function getCrystalOrmChoice(value?: CrystalOrm, framework?: string) {
  const resolution = resolveCrystalOrmPrompt(value, framework);
  if (!resolution.shouldPrompt) return resolution.autoValue ?? "none";
  const response = await navigableSelect<CrystalOrm>({ message: "Select Crystal database layer", options: resolution.options, initialValue: resolution.initialValue });
  if (isCancel(response)) return exitCancelled("Operation cancelled");
  return response;
}
