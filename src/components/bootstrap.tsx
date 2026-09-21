import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getBootstrap } from "@/lib/zunoza/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

type Boot = Awaited<ReturnType<typeof getBootstrap>>;

const Ctx = createContext<{
  data: Boot | null;
  refresh: () => void;
  markAgeConfirmed: () => void;
}>({
  data: null,
  refresh: () => {},
  markAgeConfirmed: () => {},
});

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Boot | null>(null);
  const userId = user?.id;

  const refresh = useCallback(() => {
    if (!userId) {
      setData(null);
      return;
    }
    getBootstrap()
      .then(setData)
      .catch(() => setData(null));
  }, [userId]);

  const markAgeConfirmed = useCallback(() => {
    setData((current) => (current ? { ...current, ageConfirmed: true } : current));
  }, []);

  useEffect(() => {
    if (isPending) return;
    refresh();
  }, [isPending, refresh]);

  useEffect(() => {
    if (isPending || !userId) return;
    let cancelled = false;
    import("@/lib/zunoza/payments")
      .then(({ retryMyOpenPayments }) => retryMyOpenPayments())
      .then((res) => {
        if (cancelled || !res.ok || res.already) return;
        refresh();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isPending, userId, refresh]);

  const value = useMemo(() => ({ data, refresh, markAgeConfirmed }), [data, refresh, markAgeConfirmed]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBootstrap() {
  return useContext(Ctx);
}
