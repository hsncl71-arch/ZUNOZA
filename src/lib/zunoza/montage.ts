function shotstackBase() {
  const explicit = process.env.SHOTSTACK_BASE_URL?.trim().replace(/\/$/, "");
  if (explicit && /^https:\/\/[a-z0-9.-]+/i.test(explicit)) return explicit;
  const envName = (process.env.SHOTSTACK_ENV || "").trim().toLowerCase();
  if (envName === "v1" || envName === "prod" || envName === "production") {
    return "https://api.shotstack.io/edit/v1";
  }
  return "https://api.shotstack.io/edit/stage";
}