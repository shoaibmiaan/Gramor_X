'use client';

import * as React from 'react';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';

type Props = { onCountChange?: (n: number) => void };

const DocumentUploadStub: React.FC<Props> = ({ onCountChange }) => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const list = Array.from(e.target.files ?? []);
    setFiles(list);
    onCountChange?.(list.length);
    setMsg(`${list.length} file(s) selected. (Frontend-only stub, not uploaded)`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="btn">
          <input type="file" multiple className="hidden" onChange={onPick} />
          Choose Files
        </label>
        <Button variant="secondary" disabled={files.length === 0}>Simulate Upload</Button>
      </div>
      {msg && <Alert variant="info">{msg}</Alert>}
      {files.length > 0 && (
        <ul className="text-sm list-disc pl-5">
          {files.map((f) => (
            <li key={f.name}>{f.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DocumentUploadStub;
