"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

export function TuneUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setMessage({ type: "error", text: "Choose an audio file to upload." });
      return;
    }

    const formData = new FormData();
    formData.set("file", selectedFile);
    setIsUploading(true);
    setMessage(null);

    try {
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
        text: "Upload complete. The tune was saved as a draft.",
      });
      setSelectedFile(null);

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

  return (
    <form
      className="rounded-lg border border-foreground/10 bg-white p-5 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <label className="block text-sm font-semibold" htmlFor="tune-file">
            Upload audio
          </label>
          <input
            accept="audio/*"
            className="mt-3 block w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            disabled={isUploading}
            id="tune-file"
            name="file"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setMessage(null);
            }}
            ref={fileInputRef}
            type="file"
          />
          <p className="mt-2 min-h-5 text-sm text-muted">
            {selectedFile ? selectedFile.name : "No file selected"}
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUploading || !selectedFile}
          type="submit"
        >
          <Upload aria-hidden="true" size={16} />
          {isUploading ? "Uploading" : "Upload"}
        </button>
      </div>
      {message ? (
        <p
          className={`mt-4 text-sm ${
            message.type === "success" ? "text-accent" : "text-red-700"
          }`}
          role="status"
        >
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
