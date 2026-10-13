import type { Backend, Frontend, Runtime, WebDeploy } from "@/types";

import { isWebFrontend } from "@/config/compatibility-rules";
import { DEFAULT_CONFIG } from "@/constants";
import { exitCancelled } from "@/presentation/errors";
import { isCancel, navigableSelect } from "@/prompts/core/navigable";

function hasWebFrontend(frontends: Frontend[]) {
  return frontends.some((f) => isWebFrontend(f));
}

type DeploymentOption = {
  value: WebDeploy;
  label: string;
  hint: string;
};

function getDeploymentDisplay(deployment: WebDeploy): {
  label: string;
  hint: string;
} {
  if (deployment === "cloudflare") {
    return {
      label: "Cloudflare",
      hint: "Deploy to Cloudflare Workers using Alchemy",
    };
  }
  if (deployment === "vercel") {
    return {
      label: "Vercel",
      hint: "Deploy to Vercel's edge network",
    };
  }
  return {
    label: deployment,
    hint: `Add ${deployment} deployment`,
  };
}

export async function getDeploymentChoice(
  deployment?: WebDeploy,
  _runtime?: Runtime,
  _backend?: Backend,
  frontend: Frontend[] = [],
) {
  if (deployment !== undefined) return deployment;
  if (!hasWebFrontend(frontend)) {
    return "none";
  }

  const availableDeployments = ["cloudflare", "vercel", "none"];

  const options: DeploymentOption[] = availableDeployments.map((deploy) => {
    const { label, hint } = getDeploymentDisplay(deploy as WebDeploy);
    return {
      value: deploy as WebDeploy,
      label,
      hint,
    };
  });

  const response = await navigableSelect<WebDeploy>({
    message: "Select web deployment",
    options,
    initialValue: DEFAULT_CONFIG.webDeploy,
  });

  if (isCancel(response)) return exitCancelled("Operation cancelled");

  return response;
}
