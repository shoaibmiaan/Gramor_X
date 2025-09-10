import { Icon } from "@/components/design-system/Icon";
import React from "react";
import Link from "next/link";

export type Crumb = { label: string; href?: string };
export const Breadcrumbs: React.FC<{ items: Crumb[]; className?: string }> = ({
  items,
  className = "",
}) => {
  return (
    <nav aria-label="Breadcrumb" className={`text-small ${className}`}>
      <ol className="flex items-center gap-2 text-mutedText">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-2">
            {c.href ? (
              <Link
                href={c.href}
                className="hover:text-foreground dark:hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-ds px-1"
              >
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground dark:text-foreground">
                {c.label}
              </span>
            )}
            {i < items.length - 1 && (
              <span className="opacity-60">
                <Icon name="chevron-right" />
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
