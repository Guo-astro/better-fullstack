import { getPhpCapabilityIssue } from "@better-fullstack/types";

import type { PhpAuth, PhpOrm, PhpTesting, PhpWebFramework } from "@/types";

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
  { value: "laravel", label: "Laravel", hint: "Experimental Laravel 13 JSON API" },
  { value: "symfony", label: "Symfony", hint: "Experimental Symfony 8 micro-kernel JSON API" },
  { value: "none", label: "None", hint: "No PHP service" },
];

const ORM_OPTIONS: PromptOption<PhpOrm>[] = [
  { value: "eloquent", label: "Eloquent", hint: "Laravel's ActiveRecord ORM with SQLite" },
  { value: "doctrine", label: "Doctrine ORM", hint: "Data-mapper ORM with attribute mapping" },
  { value: "cycle", label: "Cycle ORM", hint: "Data-mapper ORM with Cycle Database" },
  { value: "none", label: "None", hint: "No database layer" },
];

const AUTH_OPTIONS: PromptOption<PhpAuth>[] = [
  { value: "firebase-jwt", label: "Firebase JWT", hint: "Bearer JWT verification with firebase/php-jwt" },
  { value: "lcobucci-jwt", label: "lcobucci/jwt", hint: "Bearer JWT verification with validation constraints" },
  {
    value: "symfony-security",
    label: "Symfony Security",
    hint: "Stateless access-token firewall for Symfony",
  },
  { value: "none", label: "None", hint: "No authentication" },
];

const TESTING_OPTIONS: PromptOption<PhpTesting>[] = [
  { value: "phpunit", label: "PHPUnit", hint: "Request-level PHPUnit tests" },
  { value: "pest", label: "Pest", hint: "Pest specs that also run the PHPUnit classes" },
  { value: "codeception", label: "Codeception", hint: "Codeception Unit suite over the same tests" },
  { value: "none", label: "None", hint: "No test runner; keep only the HTTP proof" },
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

export function resolvePhpOrmPrompt(value?: PhpOrm, framework?: PhpWebFramework) {
  const options = ORM_OPTIONS.filter(
    (option) => !getPhpCapabilityIssue(framework, "orm", option.value),
  );
  return createStaticSinglePromptResolution(options, "none", value);
}

export async function getPhpOrmChoice(value?: PhpOrm, framework?: PhpWebFramework) {
  const resolution = resolvePhpOrmPrompt(value, framework);
  if (!resolution.shouldPrompt) return resolution.autoValue ?? "none";
  const response = await navigableSelect<PhpOrm>({
    message: "Select PHP ORM / database layer",
    options: resolution.options,
    initialValue: resolution.initialValue,
  });
  return isCancel(response) ? exitCancelled("Operation cancelled") : response;
}

export function resolvePhpAuthPrompt(value?: PhpAuth, framework?: PhpWebFramework) {
  const options = AUTH_OPTIONS.filter(
    (option) => !getPhpCapabilityIssue(framework, "auth", option.value),
  );
  return createStaticSinglePromptResolution(options, "none", value);
}

export async function getPhpAuthChoice(value?: PhpAuth, framework?: PhpWebFramework) {
  const resolution = resolvePhpAuthPrompt(value, framework);
  if (!resolution.shouldPrompt) return resolution.autoValue ?? "none";
  const response = await navigableSelect<PhpAuth>({
    message: "Select PHP authentication",
    options: resolution.options,
    initialValue: resolution.initialValue,
  });
  return isCancel(response) ? exitCancelled("Operation cancelled") : response;
}

export function resolvePhpTestingPrompt(value?: PhpTesting) {
  return createStaticSinglePromptResolution(TESTING_OPTIONS, "phpunit", value);
}

export async function getPhpTestingChoice(value?: PhpTesting) {
  const resolution = resolvePhpTestingPrompt(value);
  if (!resolution.shouldPrompt) return resolution.autoValue ?? "phpunit";
  const response = await navigableSelect<PhpTesting>({
    message: "Select PHP test runner",
    options: resolution.options,
    initialValue: resolution.initialValue,
  });
  return isCancel(response) ? exitCancelled("Operation cancelled") : response;
}
