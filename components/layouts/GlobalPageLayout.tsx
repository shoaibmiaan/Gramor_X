// components/layout/GlobalPageLayout.tsx
import * as React from "react";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Container } from "@/components/design-system/Container";

type Props = {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
};

export const GlobalPageLayout: React.FC<Props> = ({
  children,
  showBreadcrumbs = true,
}) => {
  return (
    <div className="w-full">
      {showBreadcrumbs && (
        <Container className="py-4">
          <Breadcrumbs />
        </Container>
      )}

      {/* main content */}
      {children}
    </div>
  );
};
