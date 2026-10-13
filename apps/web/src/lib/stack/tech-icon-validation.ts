import * as simpleIcons from "react-icons/si";

const SIMPLE_ICON_SLUGS = new Set(
  Object.keys(simpleIcons)
    .filter((name) => name.startsWith("Si"))
    .map((name) => name.slice(2).toLowerCase()),
);

export function getRemoteIconUrlError(src: string) {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return "Icon URLs must use HTTPS";
    if (url.hostname !== "cdn.simpleicons.org") return null;

    const slug = url.pathname.split("/")[1];
    return SIMPLE_ICON_SLUGS.has(slug) ? null : `Unknown Simple Icons slug "${slug}"`;
  } catch {
    return "Invalid URL";
  }
}
