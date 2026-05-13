const STORAGE_KEY = 'terra_compute_played_videos';

export function getPlayedVideos(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isVideoPlayed(videoId: string): boolean {
  return !!getPlayedVideos()[videoId];
}

export function markVideoPlayed(videoId: string): void {
  try {
    const played = getPlayedVideos();
    played[videoId] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(played));
  } catch {
    // ignore
  }
}

export function resetPlayedVideos(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get the video URL for a given card/video ID */
export function getVideoUrl(videoId: string): string {
  return `/assets/cards/${videoId}.mp4`;
}
