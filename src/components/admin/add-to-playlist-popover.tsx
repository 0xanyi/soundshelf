"use client";

import { Check, Loader2, ListMusic, Plus, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

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

const PANEL_WIDTH = 260;

export function AddToPlaylistPopover({
  playlists,
  initialSelectedIds,
  triggerLabel = "Add to playlist",
  triggerVariant = "ghost",
  triggerIcon = "plus",
  disabled = false,
  onApply,
  emptyHint = "Create a playlist first to file this tune onto one.",
}: AddToPlaylistPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds),
  );
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
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

  /**
   * The trigger lives inside a horizontally scrolling table, so an absolutely
   * positioned panel would be clipped by that container. Position it in the
   * viewport instead, measured from the trigger each time it opens.
   */
  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setPosition({
        top: rect.bottom + 6,
        left: Math.max(
          8,
          Math.min(
            rect.right - PANEL_WIDTH,
            window.innerWidth - PANEL_WIDTH - 8,
          ),
        ),
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen]);

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
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={triggerVariant === "primary" ? undefined : triggerLabel}
        className={`control ${
          triggerVariant === "primary" ? "control-solid" : "control-icon"
        }`}
        disabled={disabled}
        onClick={() => (isOpen ? closePopover() : openPopover())}
        ref={triggerRef}
        title={triggerLabel}
        type="button"
      >
        <TriggerIcon aria-hidden="true" size={triggerVariant === "primary" ? 14 : 15} />
        {triggerVariant === "primary" ? <span>{triggerLabel}</span> : null}
      </button>

      {isOpen && position ? (
        <div
          aria-labelledby={titleId}
          className="fixed z-50 bg-bg shadow-[inset_0_0_0_1px_hsl(var(--rule-strong))]"
          ref={popoverRef}
          role="dialog"
          style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
        >
          <div className="rule-b flex items-center justify-between gap-2 py-1.5 pl-3 pr-1.5">
            <p className="label" id={titleId}>
              Add to playlist
            </p>
            <button
              aria-label="Close"
              className="control control-icon size-7"
              onClick={closePopover}
              ref={closeButtonRef}
              type="button"
            >
              <X aria-hidden="true" size={13} />
            </button>
          </div>

          {playlists.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-2">{emptyHint}</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {playlists.map((playlist) => {
                const isChecked = selected.has(playlist.id);
                return (
                  <li key={playlist.id}>
                    <button
                      aria-pressed={isChecked}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-bg-raised"
                      onClick={() => toggle(playlist.id)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`grid size-4 shrink-0 place-items-center rounded-[2px] ${
                          isChecked
                            ? "bg-ink text-bg"
                            : "text-transparent ring-1 ring-rule-strong"
                        }`}
                      >
                        <Check size={11} strokeWidth={3} />
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
            <p className="px-3 pb-2 text-sm text-danger">{error}</p>
          ) : null}

          <div className="rule-t flex items-center justify-end gap-1 p-1.5">
            <button
              className="control"
              disabled={isApplying}
              onClick={closePopover}
              type="button"
            >
              Cancel
            </button>
            <button
              className="control control-solid"
              disabled={isApplying || playlists.length === 0}
              onClick={() => void apply()}
              type="button"
            >
              {isApplying ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={13} />
              ) : null}
              Done
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
