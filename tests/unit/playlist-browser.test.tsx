/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlaylistBrowser } from "../../src/components/player/playlist-browser";

type JsonResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

function jsonResponse(body: unknown): JsonResponse {
  return {
    ok: true,
    json: async () => body,
  };
}

describe("PlaylistBrowser", () => {
  afterEach(() => {
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

    expect(await screen.findAllByText("Old Track")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /evening/i }));

    await screen.findByText("Loading tracks...");

    await waitFor(() => {
      expect(screen.queryByText("Old Track")).not.toBeInTheDocument();
    });
  });
});
