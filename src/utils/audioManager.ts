// src/utils/audioManager.ts
/* ------------------------------------------------------------------ */
/*  Shared AudioContext                                               */
/* ------------------------------------------------------------------ */
declare global {
  interface Window {
    /** Safari‑/‑old‑Chrome prefixed constructor */
    webkitAudioContext?: typeof AudioContext;
  }
}

const AudioCtx = window.AudioContext ?? window.webkitAudioContext;

if (!AudioCtx) {
  throw new Error("Web Audio API is not supported in this browser.");
}

export const ctx = new AudioCtx();

/** Call once (e.g. in App.tsx) after the first user tap/click. */
export function unlockAudioContext() {
  if (ctx.state !== "suspended") return; // already running
  const resume = () => {
    ctx.resume();
    document.removeEventListener("touchstart", resume);
    document.removeEventListener("click", resume);
  };
  document.addEventListener("touchstart", resume, { once: true });
  document.addEventListener("click", resume, { once: true });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
async function fetchBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  const array = await res.arrayBuffer();
  try {
    return await ctx.decodeAudioData(array);
  } catch (err) {
    console.error("decodeAudioData failed for", url, err);
    throw err; // surface as a rejected promise
  }
}

type Sound = {
  play: () => void;
  pause: () => void;
  /** true while playing (looping sounds only) */
  isPlaying: () => boolean;
};

/* ------------------------------------------------------------------ */
/*  One‑shot sounds                       */
/* ------------------------------------------------------------------ */
async function makeOneShot(src: string, volume = 1): Promise<Sound> {
  const buffer = await fetchBuffer(src);
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);

  return {
    play() {
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(gain);
      node.start();
    },
    pause: () => {}, // no‑op for SFX
    isPlaying: () => false, // always momentary
  };
}

/* ------------------------------------------------------------------ */
/*  Looping sounds                                        */
/* ------------------------------------------------------------------ */
async function makeLoop(src: string, volume = 1): Promise<Sound> {
  const buffer = await fetchBuffer(src);
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);

  let source: AudioBufferSourceNode | null = null;
  let startedAt = 0; // ctx.currentTime when playback started
  let offset = 0; // where we paused

  const buildSource = () => {
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    node.connect(gain);
    return node;
  };

  return {
    play() {
      if (source) return; // already playing
      source = buildSource();
      startedAt = ctx.currentTime - offset;
      source.start(0, offset);
    },
    pause() {
      if (!source) return;
      offset = ctx.currentTime - startedAt;
      source.stop();
      source.disconnect();
      source = null;
    },
    isPlaying: () => !!source,
  };
}

/* ------------------------------------------------------------------ */
/*  Exported sounds + init helper                                     */
/* ------------------------------------------------------------------ */
export let grassWalk: Sound,
  grassRun: Sound,
  stoneWalk: Sound,
  stoneRun: Sound,
  soccerKick: Sound,
  trainHorn: Sound,
  mainTheme: Sound,
  worldDialog1: Sound,
  worldDialog2: Sound,
  worldDialog3: Sound,
  worldDialog4: Sound,
  clapping: Sound;

/** Pre‑load every audio file – call once before you enter the game. */
export async function initAudio() {
  const [
    grassWalk_,
    grassRun_,
    stoneWalk_,
    stoneRun_,
    soccerKick_,
    trainHorn_,
    mainTheme_,
    worldDialog1_,
    worldDialog2_,
    worldDialog3_,
    worldDialog4_,
    clapping_,
  ] = await Promise.all([
    makeLoop("/audio/footsteps/grass-walk.m4a", 0.05),
    makeLoop("/audio/footsteps/grass-run.m4a", 0.05),
    makeLoop("/audio/footsteps/stone-walk.m4a", 0.08),
    makeLoop("/audio/footsteps/stone-run.m4a", 0.08),
    makeOneShot("/audio/soccer-kick.mp3", 0.2),
    makeOneShot("/audio/train-horn.mp3", 0.05),
    makeLoop("/audio/mainTheme.mp3", 0.1),
    makeOneShot("/audio/dialog/world/worldDialog1.wav", 0.05),
    makeOneShot("/audio/dialog/world/worldDialog2.wav", 0.05),
    makeOneShot("/audio/dialog/world/worldDialog3.wav", 0.05),
    makeOneShot("/audio/dialog/world/worldDialog4.wav", 0.05),
    makeLoop("/audio/dialog/world/clapping.wav", 0.4),
  ]);

  grassWalk = grassWalk_;
  grassRun = grassRun_;
  stoneWalk = stoneWalk_;
  stoneRun = stoneRun_;
  soccerKick = soccerKick_;
  trainHorn = trainHorn_;
  mainTheme = mainTheme_;
  worldDialog1 = worldDialog1_;
  worldDialog2 = worldDialog2_;
  worldDialog3 = worldDialog3_;
  worldDialog4 = worldDialog4_;
  clapping = clapping_;
}

export const audioReady = initAudio();
