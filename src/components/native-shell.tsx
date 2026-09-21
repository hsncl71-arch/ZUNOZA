import { useEffect } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isNativeApp } from "@/lib/zunoza/native-platform";
import { attachNativeShell } from "@/lib/zunoza/native-shell";
import { isolateNativeUserCache } from "@/lib/zunoza/native-auth";
import { clearAskThread } from "@/lib/zunoza/ask-thread";

export function NativeShell() {
  const { user } = useCurrentUserState();
  useEffect(() => {
    void attachNativeShell();
  }, []);
  useEffect(() => {
    if (!isNativeApp()) return;
    try {
      const result = isolateNativeUserCache(user?.id ?? null, window.sessionStorage);
      if (result.switched) clearAskThread();
    } catch {
      /* storage blocked */
    }
  }, [user?.id]);
  return null;
}
