const SKIP = [/^\/auth(\/|$)/, /^\/api(\/|$)/];

export const NAV_FLASH_MS = 420;

export function pendingAppHref(raw: string, currentPathAndSearch: string, origin: string) {
  const href = raw.trim();
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  if (SKIP.some((re) => re.test(url.pathname))) return null;
  const next = `${url.pathname}${url.search}`;
  if (next === currentPathAndSearch) return null;
  return `${next}${url.hash}`;
}
