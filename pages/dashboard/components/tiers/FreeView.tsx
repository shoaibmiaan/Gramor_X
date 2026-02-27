import type { ReactNode } from 'react';

type FreeViewProps = {
  children?: ReactNode;
};

const FreeView = ({ children }: FreeViewProps) => {
  return <>{children}</>;
};

export default FreeView;
