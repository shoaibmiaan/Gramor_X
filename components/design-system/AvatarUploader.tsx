'use client';
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient"; // Import centralized client
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { isStoragePath } from '@/lib/avatar';

type UploadResult = {
  signedUrl: string | null;
  path: string;
};

type Props = {
  userId: string | null;
  onUploaded: (result: UploadResult) => void;
  className?: string;
  initialUrl?: string | null;
  initialPath?: string | null;
  bucket?: string; // default 'avatars'
  signedUrlTTL?: number; // seconds
};

export const AvatarUploader: React.FC<Props> = ({
  userId,
  onUploaded,
  className = "",
  initialUrl,
  initialPath,
  bucket = "avatars",
  signedUrlTTL = 60 * 60,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (initialUrl) {
      setPreview(initialUrl);
      return;
    }

    if (!initialPath || !isStoragePath(initialPath)) return;

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(initialPath, signedUrlTTL);

        if (!cancelled) {
          if (error) {
            console.warn('Failed to create initial avatar signed URL', error);
            setPreview(null);
          } else {
            setPreview(data?.signedUrl ?? null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to create initial avatar signed URL', error);
          setPreview(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialUrl, initialPath, bucket, signedUrlTTL]);

  const onSelect = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image file (JPG/PNG/WebP).");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setError("Max size is 3MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const upload = async () => {
    if (!userId || !file) return;
    setBusy(true);
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { data: signedData, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (signedErr || !signedData?.token) {
      setBusy(false);
      setError(signedErr?.message || 'Could not prepare upload.');
      return;
    }

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(path, signedData.token, file);

    if (uploadErr) {
      setBusy(false);
      setError(uploadErr.message);
      return;
    }

    const { data: urlData, error: urlErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, signedUrlTTL);

    if (urlErr) {
      setBusy(false);
      setError(urlErr.message);
      return;
    }

    const signedUrl = urlData?.signedUrl ?? null;
    if (!signedUrl) {
      setBusy(false);
      setError('Could not generate preview URL.');
      return;
    }

    setBusy(false);
    setPreview(signedUrl);
    onUploaded({ signedUrl, path });
  };

  return (
    <div className={`card-surface p-4 rounded-ds ${className}`}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onSelect(f);
        }}
        className={`
          border-2 border-dashed rounded-ds p-6 text-center cursor-pointer transition-all
          ${drag ? "border-primary bg-primary/10" : "border-border dark:border-vibrantPurple/20"}
        `}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <Image
            src={preview}
            alt="Avatar preview"
            width="112"
            height="112"
            className="mx-auto h-28 w-28 rounded-full object-cover ring-2 ring-primary/40"
          />
        ) : (
          <div className="text-muted-foreground">
            <div className="text-h3 mb-1">Upload avatar</div>
            <div className="text-small opacity-80">
              Drag & drop or click to browse
            </div>
            <div className="mt-2">
              <Badge size="sm">JPG • PNG • WebP • ≤3MB</Badge>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />

      {error && (
        <Alert variant="warning" className="mt-3">
          {error}
        </Alert>
      )}

      <div className="mt-3 flex gap-3 justify-center">
        <Button
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          className="rounded-ds-xl"
        >
          Choose file
        </Button>
        <Button
          variant="primary"
          onClick={upload}
          disabled={!file || !userId || busy}
          className="rounded-ds-xl"
        >
          {busy ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </div>
  );
};