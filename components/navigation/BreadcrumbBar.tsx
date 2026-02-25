import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/design-system/Icon";

// Humanize slug → "Test 04"
const humanize = (s: string) => {
  if (!s) return "";
  return s
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Module-aware icons
const moduleIcon = (segment: string) => {
  switch (segment.toLowerCase()) {
    case "dashboard":
      return "home";
    case "reading":
      return "book-open";
    case "listening":
      return "headphones";
    case "writing":
      return "edit";
    case "speaking":
      return "mic";
    case "mock":
      return "test-tube";
    case "profile":
      return "user";
    case "billing":
      return "credit-card";
    case "analytics":
      return "bar-chart-3";
    default:
      return null;
  }
};

export const BreadcrumbBar: React.FC<{ className?: string }> = ({ className }) => {
  const router = useRouter();
  const path = router.asPath.split("?")[0];
  const segments = path.split("/").filter(Boolean);

  const crumbs = segments.map((seg, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    return {
      raw: seg,
      label: humanize(seg),
      href,
      icon: moduleIcon(seg),
    };
  });

  return (
    <div
      className={cn(
        "w-full border-b border-border/40 bg-muted/30 backdrop-blur-sm",
        "flex items-center h-10 px-4",
        className
      )}
    >
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        {/* Home */}
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-foreground/80 transition"
        >
          <Icon name="home" className="w-3.5 h-3.5" />
        </Link>

        {crumbs.map((c, i) => (
          <React.Fragment key={c.href}>
            <span className="text-muted-foreground/30">/</span>

            {i === crumbs.length - 1 ? (
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                {c.icon && <Icon name={c.icon} className="w-3.5 h-3.5" />}
                <span>{c.label}</span>
              </div>
            ) : (
              <Link
                href={c.href}
                className="flex items-center gap-1.5 hover:text-foreground text-muted-foreground transition"
              >
                {c.icon && <Icon name={c.icon} className="w-3.5 h-3.5" />}
                <span>{c.label}</span>
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
};
