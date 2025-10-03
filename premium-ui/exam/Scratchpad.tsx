import * as React from 'react';
export function Scratchpad() {
  const [v, setV] = React.useState('');
  return <textarea value={v} onChange={(e) => setV(e.target.value)} className="w-full h-32 border p-2" />;
}
export default Scratchpad;
