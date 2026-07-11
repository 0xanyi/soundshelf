"use client";

import { CheckCircle2, FileAudio, Loader2, TriangleAlert, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { readAudioDuration } from "@/lib/audio-duration";
import { formatBytes } from "@/lib/format";
import { validateAudioFileMetadata } from "@/lib/validation/audio";

type TuneUploadFormProps = {
  maxUploadBytes: number;
};

export function TuneUploadForm({ maxUploadBytes }: TuneUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAttemptIdRef = useRef(crypto.randomUUID());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const maxUploadLabel = formatBytes(maxUploadBytes);
  const selectedFileValidation = selectedFile
    ? validateAudioFileMetadata(
        {
          type: selectedFile.type,
          size: selectedFile.size,
          name: selectedFile.name,
        },
        { maxBytes: maxUploadBytes },
      )
    : null;
  const canUpload =
    selectedFile !== null &&
    selectedFileValidation?.valid === true &&
    !isUploading;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setMessage({ type: "error", text: "Choose an audio file to upload." });
      return;
    }

    const validation = validateAudioFileMetadata(
      {
        type: selectedFile.type,
        size: selectedFile.size,
        name: selectedFile.name,
      },
      { maxBytes: maxUploadBytes },
    );

    if (!validation.valid) {
      setMessage({ type: "error", text: validation.message });
      return;
    }

    const formData = new FormData();
    formData.set("file", selectedFile);
    formData.set("uploadAttemptId", uploadAttemptIdRef.current);

    setIsUploading(true);
    setMessage(null);

    try {
      const durationSeconds = await readAudioDuration(selectedFile);

      if (durationSeconds > 0) {
        formData.set("durationSeconds", durationSeconds.toString());
      }

      const response = await fetch("/api/admin/tunes/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await readError(response);
        throw new Error(error);
      }

      setMessage({
        type: "success",
        text: "Upload complete. Song is live.",
      });
      setSelectedFile(null);
      uploadAttemptIdRef.current = crypto.randomUUID();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Upload failed. If this mentions Content-Length, retry from a browser form upload.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    uploadAttemptIdRef.current = crypto.randomUUID();

    if (!file) {
      setMessage(null);
      return;
    }

    const validation = validateAudioFileMetadata(
      {
        type: file.type,
        size: file.size,
        name: file.name,
      },
      { maxBytes: maxUploadBytes },
    );

    setMessage(
      validation.valid
        ? null
        : {
            type: "error",
            text: validation.message,
          },
    );
  }

  return (
    <form className="panel-quiet p-5 sm:p-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <label
            className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--muted))]"
            htmlFor="tune-file"
          >
            Upload audio
          </label>
          <label
            className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-2)/0.5)] px-4 py-3 text-sm transition hover:border-[hsl(var(--accent)/0.5)] hover:bg-[hsl(var(--surface-2))]"
            htmlFor="tune-file"
          >
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.7)] text-[hsl(var(--accent))]"
            >
              <FileAudio size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-foreground">
                {selectedFile ? selectedFile.name : "Choose an audio file"}
              </span>
              <span className="block text-xs text-[hsl(var(--muted))]">
                {selectedFile
                  ? formatBytes(selectedFile.size)
                  : `MP3, WAV, M4A, OGG, FLAC · up to ${maxUploadLabel}`}
              </span>
            </span>
            <input
              accept="audio/*"
              className="sr-only"
              disabled={isUploading}
              id="tune-file"
              name="file"
              onChange={(event) => {
                handleFileChange(event.target.files?.[0] ?? null);
              }}
              ref={fileInputRef}
              type="file"
            />
          </label>
        </div>
        <button
          className="btn-primary"
          disabled={!canUpload}
          type="submit"
        >
          {isUploading ? (
            <>
              <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              Uploading
            </>
          ) : (
            <>
              <Upload size={16} aria-hidden="true" />
              Upload
            </>
          )}
        </button>
      </div>
      {message ? (
        <p
          className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-[hsl(var(--accent)/0.4)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]"
              : "border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.12)] text-[hsl(var(--danger))]"
          }`}
          role="status"
        >
          {message.type === "success" ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : (
            <TriangleAlert size={16} aria-hidden="true" />
          )}
          {message.text}
        </p>
      ) : null}
    </form>
  );
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };

    return body.error ?? "Upload failed.";
  } catch {
    return "Upload failed.";
  }
}