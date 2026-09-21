import { useRef } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState, type AppUser } from "@/lib/auth/use-current-user";
import { FullScreenLoader } from "@/components/screen-loader";

/** Keep the last known user while the session refetches so pages don't flash "Yükleniyor". */
export function useStickyUser() {
  const { user, isPending } = useCurrentUserState();
  const last = useRef<AppUser | null>(user);
  if (user) last.current = user;
  const sticky = user ?? (isPending ? last.current : null);
  return { user: sticky, isPending: isPending && !sticky };
}

export function AppGate({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useStickyUser();
  if (isPending) return <FullScreenLoader />;
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}
