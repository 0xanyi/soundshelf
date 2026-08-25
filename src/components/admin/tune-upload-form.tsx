"use client";

import { Check, Loader2, TriangleAlert, Upload } from "lucide-react";
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
        text: "Upload complete. The tune is live.",
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
    <form onSubmit={handleSubmit}>
      <p className="label">Accession</p>

      {/* A ruled field, consistent with every other input on the surface —
          the dashed drop-zone box is the container this world does not use. */}
      <div className="rule-b mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-2.5">
        <label
          className="group min-w-0 flex-1 cursor-pointer py-1"
          htmlFor="tune-file"
        >
          <span className="block truncate text-base text-ink group-hover:text-mood-ink">
            {selectedFile ? selectedFile.name : "Choose an audio file"}
          </span>
          <span className="figure mt-0.5 block text-xs text-ink-3">
            {selectedFile
              ? formatBytes(selectedFile.size)
              : `MP3, WAV, M4A, OGG, FLAC · up to ${maxUploadLabel}`}
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

        <button className="control control-solid" disabled={!canUpload} type="submit">
          {isUploading ? (
            <>
              <Loader2 size={14} aria-hidden="true" className="animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload size={14} aria-hidden="true" />
              Upload
            </>
          )}
        </button>
      </div>

      {message ? (
        <p
          className={`mt-2.5 inline-flex items-center gap-2 text-sm ${
            message.type === "success" ? "text-ink-2" : "text-danger"
          }`}
          role="status"
        >
          {message.type === "success" ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <TriangleAlert size={14} aria-hidden="true" />
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
