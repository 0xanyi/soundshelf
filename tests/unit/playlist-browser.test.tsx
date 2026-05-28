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
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  });

  it("loads the initial playlist instead of the first playlist", async () => {
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
                durationSeconds: 90,
              },
              {
                id: "playlist-evening",
                title: "Evening",
                description: null,
                itemCount: 1,
                durationSeconds: 120,
              },
            ],
          }),
        );
      }

      if (url === "/api/public/playlists/playlist-evening") {
        return Promise.resolve(
          jsonResponse({
            id: "playlist-evening",
            title: "Evening",
            description: null,
            itemCount: 1,
            durationSeconds: 120,
            tracks: [
              {
                id: "track-evening",
                playlistItemId: "item-evening",
                title: "Evening Track",
                durationSeconds: 120,
                audioUrl: "https://audio.example.test/evening.mp3",
              },
            ],
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistBrowser initialPlaylistId="playlist-evening" />);

    expect(await screen.findAllByText("Evening Track")).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/public/playlists/playlist-morning",
      expect.anything(),
    );
  });

  it("copies a link to the selected playlist", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...window.navigator,
      clipboard: { writeText },
    });

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
                durationSeconds: 90,
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
            durationSeconds: 90,
            tracks: [
              {
                id: "track-morning",
                playlistItemId: "item-morning",
                title: "Morning Track",
                durationSeconds: 90,
                audioUrl: "https://audio.example.test/morning.mp3",
              },
            ],
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<PlaylistBrowser />);

    await screen.findAllByText("Morning Track");

    fireEvent.click(screen.getByRole("button", { name: /share playlist/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedUrl = new URL(writeText.mock.calls[0][0]);
    expect(copiedUrl.searchParams.get("playlist")).toBe("playlist-morning");
    expect(await screen.findByRole("button", { name: /link copied/i })).toBeInTheDocument();
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
                durationSeconds: 90,
              },
              {
                id: "playlist-evening",
                title: "Evening",
                description: null,
                itemCount: 1,
                durationSeconds: 120,
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
            durationSeconds: 90,
            tracks: [
              {
                id: "track-old",
                playlistItemId: "item-old",
                title: "Old Track",
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

    // The queue is closed by default, so the active track title appears
    // only in the player display.
    expect(await screen.findAllByText("Old Track")).toHaveLength(1);

    const eveningButtons = await screen.findAllByRole("button", {
      name: /evening/i,
    });
    fireEvent.click(eveningButtons[0]);

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
                durationSeconds: 90,
              },
              {
                id: "playlist-evening",
                title: "Evening",
                description: null,
                itemCount: 1,
                durationSeconds: 120,
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
            durationSeconds: 120,
            tracks: [
              {
                id: "track-new",
                playlistItemId: "item-new",
                title: "New Track",
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

    expect(await screen.findAllByText("New Track")).toHaveLength(1);

    morningJson.resolve({
      id: "playlist-morning",
      title: "Morning",
      description: null,
      itemCount: 1,
      durationSeconds: 90,
      tracks: [
        {
          id: "track-old",
          playlistItemId: "item-old",
          title: "Old Track",
          durationSeconds: 90,
          audioUrl: "https://audio.example.test/old.mp3",
        },
      ],
    });

    await waitFor(() => {
      expect(screen.queryByText("Old Track")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("New Track")).toHaveLength(1);
  });
});
