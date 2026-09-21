export function maskEmail(email: string | null | undefined) {
  const value = (email ?? "").trim().toLowerCase();
  if (!value) return "—";
  const at = value.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = value.slice(0, at);
  const domain = value.slice(at);
  if (local.length <= 2) return `***${domain}`;
  return `${local.slice(0, 2)}***${domain}`;
}

export function isRealEmail(email: string | null | undefined) {
  const value = (email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  if (value.endsWith("@zunoza.app") || value.endsWith("@zunoza.test") || value.endsWith(".invalid")) {
    return false;
  }
  return true;
}
