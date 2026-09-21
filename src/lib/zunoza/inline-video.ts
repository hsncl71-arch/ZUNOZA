/** iOS/Safari-safe inline preview: muted autoplay, loud play only on user gesture. */

let loud: HTMLVideoElement | null = null;
const playing = new Set<HTMLVideoElement>();
export const MAX_INLINE_VIDEOS = 2;

function rememberPlaying(video: HTMLVideoElement) {
  playing.add(video);
  for (const other of [...playing]) {
    if (playing.size <= MAX_INLINE_VIDEOS) break;
    if (other === video) continue;
    other.pause();
    playing.delete(other);
  }
}

export function prepInlineVideo(video: HTMLVideoElement) {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.playsInline = true;
  video.loop = true;
}

export function playMuted(video: HTMLVideoElement) {
  rememberPlaying(video);
  video.defaultMuted = true;
  video.muted = true;
  void video.play().catch(() => undefined);
}

export function playLoud(video: HTMLVideoElement) {
  if (loud && loud !== video) {
    loud.muted = true;
    loud.defaultMuted = true;
  }
  loud = video;
  rememberPlaying(video);
  video.defaultMuted = false;
  video.muted = false;
  video.volume = 1;
  video.removeAttribute("muted");
  return video.play().catch(() => undefined);
}

export function muteInline(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  if (loud === video) loud = null;
}

export function stopInline(video: HTMLVideoElement) {
  video.pause();
  muteInline(video);
  playing.delete(video);
  // Keep src so the poster/last frame stays. Removing src paints a black frame.
}
