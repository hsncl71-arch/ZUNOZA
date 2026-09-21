import { assertSameSiteRequest } from "@/lib/auth/isolation.server";
import { getSessionUser } from "@/lib/auth/verify.server";

export async function requireMediaUser(request: Request) {
  try {
    assertSameSiteRequest();
  } catch {
    return null;
  }
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  return getSessionUser(bearer);
}
