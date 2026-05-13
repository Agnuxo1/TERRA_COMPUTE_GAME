import { useState, useCallback } from 'react';

const STORAGE_KEY = 'terra_compute_played_videos';

/**
 * Video playback system for Terra Compute.
 * Tracks which videos have been played (persists in localStorage).
 * Videos play ONCE for modes/factions/buttons/buildings.
 * Videos ALWAYS play for historical events.
 */

function getPlayedSet(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore */ }
  return new Set();
}

function savePlayedSet(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

/**
 * Check if a video should play (only plays once per ID).
 * For historical events, pass `alwaysPlay = true`.
 */
export function shouldPlayVideo(videoId: string, alwaysPlay = false): boolean {
  if (alwaysPlay) return true;
  const played = getPlayedSet();
  return !played.has(videoId);
}

/**
 * Mark a video as played.
 */
export function markVideoPlayed(videoId: string) {
  const played = getPlayedSet();
  played.add(videoId);
  savePlayedSet(played);
}

/**
 * Get video path for a given ID.
 * Returns null if video shouldn't play (already played and not alwaysPlay).
 */
export function getVideoPath(videoId: string, alwaysPlay = false): string | null {
  if (!shouldPlayVideo(videoId, alwaysPlay)) return null;
  return `/assets/videos/${videoId}.mp4`;
}

/**
 * React hook for video playback.
 * Returns: { activeVideo, playVideo, clearVideo }
 */
export function useVideoPlayer() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const playVideo = useCallback((videoId: string, alwaysPlay = false) => {
    const path = getVideoPath(videoId, alwaysPlay);
    if (path) {
      markVideoPlayed(videoId);
      setActiveVideo(path);
      return true;
    }
    return false;
  }, []);

  const clearVideo = useCallback(() => {
    setActiveVideo(null);
  }, []);

  return { activeVideo, playVideo, clearVideo };
}

/**
 * Reset all played videos (for testing).
 */
export function resetPlayedVideos() {
  localStorage.removeItem(STORAGE_KEY);
}
