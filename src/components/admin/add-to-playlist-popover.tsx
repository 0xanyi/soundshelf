"use client";

import { Check, Loader2, ListMusic, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { SerializedAdminPlaylist } from "@/lib/playlists/admin";

type PopoverPlaylist = Pick<SerializedAdminPlaylist, "id" | "title">;

type AddToPlaylistPopoverProps = {
  playlists: PopoverPlaylist[];
  initialSelectedIds: string[];
  triggerLabel?: string;
  triggerVariant?: "ghost" | "primary";
  triggerIcon?: "plus" | "list";
  disabled?: boolean;
  /**
   * Returns true on success (popover closes), false on failure (stays open).
   */
  onApply: (playlistIds: string[]) => Promise<boolean>;
  emptyHint?: string;
};

export function AddToPlaylistPopover({
  playlists,
  initialSelectedIds,
  triggerLabel = "Add to playlist",
  triggerVariant = "ghost",
  triggerIcon = "plus",
  disabled = false,
  onApply,
  emptyHint = "Create a playlist first to add this song.",
}: AddToPlaylistPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds),
  );
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  function openPopover() {
    setSelected(new Set(initialSelectedIds));
    setError(null);
    setIsOpen(true);
  }

  function closePopover() {
    setIsOpen(false);
    // Return focus to the trigger so keyboard users land back where they were.
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!isOpen) return;

    // Move focus into the dialog on open so screen readers announce it and
    // tab order stays inside the popover surface.
    closeButtonRef.current?.focus();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        // Skip focus restore on outside click; the user has already moved on.
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closePopover();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function apply() {
    setIsApplying(true);
    setError(null);

    try {
      const ok = await onApply([...selected]);
      if (ok) {
        closePopover();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setIsApplying(false);
    }
  }

  const TriggerIcon = triggerIcon === "plus" ? Plus : ListMusic;

  return (
    <div className="relative inline-block">
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={triggerVariant === "primary" ? "btn-primary" : "btn-ghost-icon"}
        disabled={disabled}
        onClick={() => (isOpen ? closePopover() : openPopover())}
        ref={triggerRef}
        title={triggerLabel}
        type="button"
      >
        <TriggerIcon aria-hidden="true" size={16} />
        {triggerVariant === "primary" ? <span>{triggerLabel}</span> : null}
      </button>

      {isOpen ? (
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.98)] p-3 shadow-[0_20px_60px_-20px_hsl(var(--accent)/0.4)] backdrop-blur"
          ref={popoverRef}
          role="dialog"
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted))]"
              id={titleId}
            >
              Add to playlist
            </p>
            <button
              aria-label="Close"
              className="btn-ghost-icon"
              onClick={closePopover}
              ref={closeButtonRef}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>

          {playlists.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[hsl(var(--muted))]">
              {emptyHint}
            </p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {playlists.map((playlist) => {
                const isChecked = selected.has(playlist.id);
                return (
                  <li key={playlist.id}>
                    <button
                      aria-pressed={isChecked}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-[hsl(var(--surface-2)/0.7)]"
                      onClick={() => toggle(playlist.id)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`grid size-5 place-items-center rounded-md border ${
                          isChecked
                            ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]"
                            : "border-[hsl(var(--border))] text-transparent"
                        }`}
                      >
                        <Check size={12} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {playlist.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error ? (
            <p className="mt-2 rounded-lg border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.1)] px-2 py-1.5 text-xs text-[hsl(var(--danger))]">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-[hsl(var(--border)/0.5)] pt-2">
            <button
              className="btn-secondary"
              disabled={isApplying}
              onClick={closePopover}
              type="button"
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={isApplying || playlists.length === 0}
              onClick={() => void apply()}
              type="button"
            >
              {isApplying ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={14} />
              ) : (
                <Check aria-hidden="true" size={14} />
              )}
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
