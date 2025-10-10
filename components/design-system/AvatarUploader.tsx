'use client';

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { supabase } from "@/lib/supabaseClient"; // Import centralized client

import { Alert } from "./Alert";
import { Badge } from "./Badge";
import { Button } from "./Button";

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
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Max size is 5MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const upload = async () => {
    if (!userId || !file) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/profile/avatar-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          bucket,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Could not start upload" }));
        throw new Error(data.error || "Could not start upload");
      }

      const { uploadUrl, path } = (await res.json()) as { uploadUrl: string; path: string };

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(text || "Upload failed");
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = data.publicUrl;

      onUploaded(publicUrl, path);
      setPreview(publicUrl);
      setFile(null);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
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
              <Badge size="sm">JPG • PNG • WebP • ≤5MB</Badge>
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