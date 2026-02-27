import React from "react";

/**
 * Temporary shim. Replace with a re-export from the real path if it exists:
 * export { RequirePlanRibbon } from "@/components/paywall/RequirePlanRibbon";
 */
export function RequirePlanRibbon(props: { plan?: string; className?: string; children?: React.ReactNode }) {
  const plan = props.plan ?? "free";
  return (
    <div className={["rounded-xl border p-3 text-sm", props.className].filter(Boolean).join(" ")}>
      <strong>Coming soon / gated</strong> — required plan: <code>{plan}</code>.
      {props.children ? <div className="mt-2">{props.children}</div> : null}
    </div>
  );
}
