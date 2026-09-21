import type { ReactNode } from "react";

export function StudioHead({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="studio-head">
      {kicker ? <p className="studio-kicker">{kicker}</p> : null}
      <h1 className="studio-title">{title}</h1>
      {children ? <div className="studio-lede">{children}</div> : null}
    </header>
  );
}
