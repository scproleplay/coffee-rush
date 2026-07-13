export const STORAGE_KEY = 'reactionTimerBestMs';
export const SHARE_PATH = '/reaction-timer/';
export const MIN_WAIT_MS = 2000;
export const MAX_WAIT_MS = 5000;

export type RtState = 'idle' | 'waiting' | 'ready' | 'result' | 'too_soon';
