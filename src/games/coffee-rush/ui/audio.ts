export type ClickOpts = {
  type?: OscillatorType;
  freq?: number;
  freqEnd?: number;
  peak?: number;
  dur?: number;
};

export function createRushAudio(getEnabled: () => boolean) {
  let audioCtx: AudioContext | null = null;

  function getAudioCtx(): AudioContext | null {
    if (audioCtx) return audioCtx;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    } catch {
      audioCtx = null;
    }
    return audioCtx;
  }

  function playClick(opts: ClickOpts = {}): void {
    if (!getEnabled()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        void ctx.resume();
      } catch {
        /* ignore */
      }
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.freq || 720, now);
    osc.frequency.exponentialRampToValueAtTime(
      opts.freqEnd || (opts.freq ? opts.freq * 0.5 : 320),
      now + 0.08,
    );
    const peak = opts.peak != null ? opts.peak : 0.18;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (opts.dur || 0.09));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (opts.dur || 0.1) + 0.02);
  }

  return {
    prime: getAudioCtx,
    playClick,
    playGolden: () => playClick({ type: 'triangle', freq: 1100, freqEnd: 1600, peak: 0.22, dur: 0.14 }),
    playNormal: () => playClick({ type: 'square', freq: 720, freqEnd: 360, peak: 0.16, dur: 0.08 }),
    playCountdown: () => playClick({ type: 'sine', freq: 520, freqEnd: 520, peak: 0.14, dur: 0.12 }),
    playGo: () => playClick({ type: 'sawtooth', freq: 880, freqEnd: 1320, peak: 0.22, dur: 0.18 }),
    playEnd: () => playClick({ type: 'sine', freq: 440, freqEnd: 220, peak: 0.18, dur: 0.25 }),
  };
}
