import React from 'react';

export function TokenCard() {
  return (
    <div className="w-[360px] rounded-lg border border-border bg-card text-text shadow-sm p-4">
      <h3 className="text-lg font-semibold">Design Tokens Check</h3>
      <p className="mt-2 text-sm text-mutedText">
        This card uses <code>bg-card</code>, <code>text-text</code>, and <code>border-border</code>.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="rounded-md bg-primary px-3 py-2 text-white">
          Primary
        </button>
        <button className="rounded-md bg-accent/20 px-3 py-2 text-text border border-accent/40">
          Accent/20
        </button>
      </div>

      <div className="mt-4 rounded-md bg-lightBg/40 p-3">
        <div className="text-sm">Spacing uses CSS vars too:</div>
        <div className="mt-2 flex gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="inline-block h-2 w-2 rounded-full bg-success" />
        </div>
      </div>
    </div>
  );
}

export default TokenCard;
