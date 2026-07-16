/**
 * Lightweight WebAudio SFX for Coffee Escape (no external assets).
 * Muted preference is stored in localStorage. Sounds only play after
 * unlock() has been called from a user gesture.
 */

export const MUTE_STORAGE_KEY = 'codecup-coffee-escape-muted';

export type CeSfx =
  | 'jump'
  | 'doubleJump'
  | 'bean'
  | 'boost'
  | 'hit'
  | 'gameOver'
  | 'newBest';

type Tone = {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number;
  peak?: number;
  dur?: number;
  delay?: number;
};

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export interface CeAudio {
  /** Call from a click/tap/keydown so the browser allows audio. */
  unlock: () => void;
  isMuted: () => boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => boolean;
  play: (sfx: CeSfx) => void;
}

export function createCeAudio(): CeAudio {
  let muted = loadMuted();
  let unlocked = false;
  let ctx: AudioContext | null = null;

  function getCtx(): AudioContext | null {
    if (ctx) return ctx;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function unlock(): void {
    unlocked = true;
    const c = getCtx();
    if (c && c.state === 'suspended') {
      try {
        void c.resume();
      } catch {
        /* ignore */
      }
    }
  }

  function tone(opts: Tone): void {
    if (muted || !unlocked) return;
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') {
      try {
        void c.resume();
      } catch {
        /* ignore */
      }
    }
    const now = c.currentTime + (opts.delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, now);
    const end = opts.freqEnd ?? opts.freq * 0.6;
    try {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, end),
        now + (opts.dur || 0.1),
      );
    } catch {
      osc.frequency.setValueAtTime(end, now + (opts.dur || 0.1));
    }
    const peak = opts.peak ?? 0.14;
    const dur = opts.dur ?? 0.1;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  function play(sfx: CeSfx): void {
    switch (sfx) {
      case 'jump':
        // Soft spring
        tone({ type: 'triangle', freq: 380, freqEnd: 620, peak: 0.12, dur: 0.09 });
        break;
      case 'doubleJump':
        // Steam puff — two soft pips
        tone({ type: 'sine', freq: 520, freqEnd: 880, peak: 0.11, dur: 0.08 });
        tone({
          type: 'triangle',
          freq: 720,
          freqEnd: 420,
          peak: 0.08,
          dur: 0.1,
          delay: 0.05,
        });
        break;
      case 'bean':
        // Bright pickup chime
        tone({ type: 'sine', freq: 880, freqEnd: 1320, peak: 0.14, dur: 0.1 });
        tone({
          type: 'triangle',
          freq: 1320,
          freqEnd: 1760,
          peak: 0.08,
          dur: 0.08,
          delay: 0.06,
        });
        break;
      case 'boost':
        // Whoosh up
        tone({ type: 'sawtooth', freq: 180, freqEnd: 640, peak: 0.1, dur: 0.18 });
        tone({
          type: 'triangle',
          freq: 400,
          freqEnd: 900,
          peak: 0.07,
          dur: 0.14,
          delay: 0.03,
        });
        break;
      case 'hit':
        // Soft thud / danger bump
        tone({ type: 'square', freq: 160, freqEnd: 70, peak: 0.12, dur: 0.12 });
        tone({
          type: 'sine',
          freq: 220,
          freqEnd: 90,
          peak: 0.08,
          dur: 0.1,
          delay: 0.02,
        });
        break;
      case 'gameOver':
        // Descending sad blip
        tone({ type: 'sine', freq: 420, freqEnd: 180, peak: 0.14, dur: 0.22 });
        tone({
          type: 'triangle',
          freq: 280,
          freqEnd: 120,
          peak: 0.1,
          dur: 0.28,
          delay: 0.1,
        });
        break;
      case 'newBest':
        // Little fanfare
        tone({ type: 'triangle', freq: 660, freqEnd: 880, peak: 0.14, dur: 0.1 });
        tone({
          type: 'sine',
          freq: 880,
          freqEnd: 1100,
          peak: 0.12,
          dur: 0.12,
          delay: 0.09,
        });
        tone({
          type: 'triangle',
          freq: 1100,
          freqEnd: 1320,
          peak: 0.1,
          dur: 0.16,
          delay: 0.18,
        });
        break;
    }
  }

  return {
    unlock,
    isMuted: () => muted,
    setMuted: (m: boolean) => {
      muted = m;
      saveMuted(m);
    },
    toggleMuted: () => {
      muted = !muted;
      saveMuted(muted);
      return muted;
    },
    play,
  };
}
