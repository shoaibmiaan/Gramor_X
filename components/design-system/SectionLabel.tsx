'use client';

import * as React from 'react';

export type SectionLabelProps = {
  children: React.ReactNode;
  className?: string;
};

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, className }) => (
  <div
    className={['mb-3 text-small uppercase tracking-wide text-mutedText', className]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </div>
);

export default SectionLabel;
