import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MUTE_STORAGE_KEY, createCeAudio } from './audio';

describe('createCeAudio mute preference', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to unmuted', () => {
    const a = createCeAudio();
    expect(a.isMuted()).toBe(false);
  });

  it('persists mute to localStorage', () => {
    const a = createCeAudio();
    expect(a.toggleMuted()).toBe(true);
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe('1');
    expect(a.toggleMuted()).toBe(false);
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe('0');
  });

  it('reads saved mute on create', () => {
    localStorage.setItem(MUTE_STORAGE_KEY, '1');
    const a = createCeAudio();
    expect(a.isMuted()).toBe(true);
  });

  it('play does not throw when locked or muted', () => {
    const a = createCeAudio();
    expect(() => a.play('jump')).not.toThrow();
    a.setMuted(true);
    a.unlock();
    expect(() => a.play('bean')).not.toThrow();
  });
});
