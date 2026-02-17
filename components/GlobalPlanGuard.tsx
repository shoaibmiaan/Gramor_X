import React from "react";

export function GlobalPlanGuard({ children }: { children: React.ReactNode }) {
  // TODO: hook real gating later
  return <>{children}</>;
}
export default GlobalPlanGuard; // required because you import it as default
