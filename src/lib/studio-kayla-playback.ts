/**
 * Owner desk playback for Kayla.
 * A newer question stops the previous clip. Failure leaves the written sentence.
 */

type PlaybackHandler = ((this: GlobalEventHandlers, ev: Event) => void) | null;

type PlaybackAudio = {
  src: string;
  paused: boolean;
  onended: PlaybackHandler;
  onerror: PlaybackHandler;
  play: () => Promise<void>;
  pause: () => void;
};

let generation = 0;
let activeAudio: PlaybackAudio | null = null;
let activeUrl: string | null = null;

function stopAudio(): void {
  const audio = activeAudio;
  activeAudio = null;
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
    } catch {
      /* already stopped */
    }
  }
  if (activeUrl && typeof URL !== "undefined") {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}

export function cancelKaylaPlayback(): void {
  generation += 1;
  stopAudio();
}

export async function playKaylaReply(input: {
  audioBase64: string;
  onStart?: () => void;
  onEnd?: () => void;
  createAudio?: () => PlaybackAudio;
}): Promise<"kayla" | "cancelled" | "silent"> {
  cancelKaylaPlayback();
  const token = generation;
  if (!input.audioBase64 || (typeof window === "undefined" && !input.createAudio)) {
    input.onEnd?.();
    return "silent";
  }
  const binary = atob(input.audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
  if (token !== generation) {
    URL.revokeObjectURL(url);
    return "cancelled";
  }
  const audio = input.createAudio?.() ?? new Audio();
  activeAudio = audio;
  activeUrl = url;
  audio.src = url;
  audio.onended = () => {
    if (token === generation) input.onEnd?.();
    if (activeAudio === audio) stopAudio();
  };
  audio.onerror = () => {
    if (token === generation) input.onEnd?.();
    if (activeAudio === audio) stopAudio();
  };
  try {
    await audio.play();
  } catch {
    if (activeAudio === audio) stopAudio();
    if (token === generation) input.onEnd?.();
    return "silent";
  }
  if (token !== generation) {
    try {
      audio.pause();
    } catch {
      /* replaced */
    }
    return "cancelled";
  }
  input.onStart?.();
  return "kayla";
}
