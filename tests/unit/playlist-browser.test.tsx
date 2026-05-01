/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlaylistBrowser } from "../../src/components/player/playlist-browser";

type JsonResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function jsonResponse(body: unknown): JsonResponse {
  return {
    ok: true,
    json: async () => body,
  };
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("PlaylistBrowser", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("clears the previous playlist detail while a newly selected playlist loads", async () => {
    const pendingPlaylist = new Promise<JsonResponse>(() => {});
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();

      if (url === "/api/public/playlists") {
        return Promise.resolve(
          jsonResponse({
            playlists: [
              {
                id: "playlist-morning",
                title: "Morning",
                description: null,
                itemCount: 1,
              },
              {
                id: "playlist-evening",
                title: "Evening",
                description: null,
                itemCount: 1,
              },
            ],
          }),
        );
      }

      if (url === "/api/public/playlists/playlist-morning") {
        return Promise.resolve(
          jsonResponse({
            id: "playlist-morning",
            title: "Morning",
            description: null,
            itemCount: 1,
            tracks: [
              {
                id: "track-old",
                playlistItemId: "item-old",
                title: "Old Track",
                description: null,
                durationSeconds: 90,
                audioUrl: "https://audio.example.test/old.mp3",
              },
            ],
          }),
        );
      }

      if (url === "/api/public/playlists/playlist-evening") {
        return pendingPlaylist;
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistBrowser />);

    // The active track title appears in the player display, in the
    // desktop sidebar's expanded track row, and in the mobile accordion's
    // track row — three render locations under jsdom.
    expect(await screen.findAllByText("Old Track")).toHaveLength(3);

    // The browser renders both a mobile rail and a desktop sidebar at the
    // same time in jsdom (no media-query gating); click the first match.
    const eveningButtons = await screen.findAllByRole("button", {
      name: /evening/i,
    });
    fireEvent.click(eveningButtons[0]);

    await screen.findByText("Loading tracks...");

    await waitFor(() => {
      expect(screen.queryByText("Old Track")).not.toBeInTheDocument();
    });
  });

  it("ignores stale playlist details that resolve after a newer selection", async () => {
    const morningJson = deferred<unknown>();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();

      if (url === "/api/public/playlists") {
        return Promise.resolve(
          jsonResponse({
            playlists: [
              {
                id: "playlist-morning",
                title: "Morning",
                description: null,
                itemCount: 1,
              },
              {
                id: "playlist-evening",
                title: "Evening",
                description: null,
                itemCount: 1,
              },
            ],
          }),
        );
      }

      if (url === "/api/public/playlists/playlist-morning") {
        return Promise.resolve({
          ok: true,
          json: () => morningJson.promise,
        });
      }

      if (url === "/api/public/playlists/playlist-evening") {
        return Promise.resolve(
          jsonResponse({
            id: "playlist-evening",
            title: "Evening",
            description: null,
            itemCount: 1,
            tracks: [
              {
                id: "track-new",
                playlistItemId: "item-new",
                title: "New Track",
                description: null,
                durationSeconds: 120,
                audioUrl: "https://audio.example.test/new.mp3",
              },
            ],
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistBrowser />);

    const eveningButtons = await screen.findAllByRole("button", {
      name: /evening/i,
    });
    fireEvent.click(eveningButtons[0]);

    expect(await screen.findAllByText("New Track")).toHaveLength(3);

    morningJson.resolve({
      id: "playlist-morning",
      title: "Morning",
      description: null,
      itemCount: 1,
      tracks: [
        {
          id: "track-old",
          playlistItemId: "item-old",
          title: "Old Track",
          description: null,
          durationSeconds: 90,
          audioUrl: "https://audio.example.test/old.mp3",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.queryByText("Old Track")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("New Track")).toHaveLength(3);
  });
});
