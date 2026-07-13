import {
  fetchTop100,
  formatGameValue,
  submitScore,
  type ScoreRow,
} from '@shared/leaderboard/client';
import { loadGuestNickname, saveGuestNickname } from '@shared/auth/session';
import { MAX_WAIT_MS, MIN_WAIT_MS, SHARE_PATH, STORAGE_KEY, type RtState } from './config';
import { formatMs, getRating, isNewBest, randomWaitMs } from './systems/rating';

function must<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as unknown as T;
}

const playArea = must<HTMLButtonElement>('playArea');
const messageEl = must<HTMLElement>('rtMessage');
const resultTimeEl = must<HTMLElement>('rtResultTime');
const ratingEl = must<HTMLElement>('rtRating');
const resultActionsEl = must<HTMLElement>('rtResultActions');
const tryAgainBtn = must<HTMLButtonElement>('rtTryAgain');
const shareBtn = must<HTMLButtonElement>('rtShare');
const resetBestBtn = document.getElementById('rtResetBest') as HTMLButtonElement | null;
const copiedToastEl = must<HTMLElement>('rtCopiedToast');
const bestEl = must<HTMLElement>('rtBest');
const lastEl = must<HTMLElement>('rtLast');
const triesEl = must<HTMLElement>('rtTries');
const lbList = must<HTMLElement>('lbListRT');
const lbNickname = must<HTMLInputElement>('lbNicknameRT');
const lbSubmit = must<HTMLButtonElement>('lbSubmitRT');
const lbStatus = must<HTMLElement>('lbStatusRT');

let state: RtState = 'idle';
let waitTimerId: ReturnType<typeof setTimeout> | null = null;
let copiedTimerId: ReturnType<typeof setTimeout> | null = null;
let readyAt = 0;
let lastMs: number | null = null;
let bestMs: number | null = loadBestNullable();
let tries = 0;
let lastSubmittedNick = '';

function loadBestNullable(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function saveBestMs(ms: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(ms));
  } catch {
    /* ignore */
  }
}

function renderStats(): void {
  bestEl.textContent = formatMs(bestMs);
  lastEl.textContent = formatMs(lastMs);
  triesEl.textContent = String(tries);
}

function setStateClass(s: string): void {
  playArea.classList.remove('is-idle', 'is-waiting', 'is-ready', 'is-result', 'is-too-soon');
  playArea.classList.add(`is-${s}`);
}

function clearWaitTimer(): void {
  if (waitTimerId) {
    clearTimeout(waitTimerId);
    waitTimerId = null;
  }
}

function showCopiedToast(text: string): void {
  copiedToastEl.textContent = text;
  copiedToastEl.classList.add('show');
  if (copiedTimerId) clearTimeout(copiedTimerId);
  copiedTimerId = setTimeout(() => copiedToastEl.classList.remove('show'), 1600);
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('copy failed');
}

function showIdle(): void {
  state = 'idle';
  clearWaitTimer();
  setStateClass('idle');
  messageEl.textContent = 'Tap to Start';
  messageEl.hidden = false;
  resultTimeEl.hidden = true;
  ratingEl.hidden = true;
  resultActionsEl.hidden = true;
  shareBtn.hidden = true;
  playArea.setAttribute('aria-label', 'Start reaction timer');
}

function startWaiting(): void {
  state = 'waiting';
  setStateClass('waiting');
  messageEl.textContent = 'Wait...';
  messageEl.hidden = false;
  resultTimeEl.hidden = true;
  ratingEl.hidden = true;
  resultActionsEl.hidden = true;
  shareBtn.hidden = true;
  playArea.setAttribute('aria-label', 'Wait for green');
  const delay = randomWaitMs(MIN_WAIT_MS, MAX_WAIT_MS);
  clearWaitTimer();
  waitTimerId = setTimeout(() => {
    waitTimerId = null;
    if (state !== 'waiting') return;
    showReady();
  }, delay);
}

function showReady(): void {
  state = 'ready';
  setStateClass('ready');
  messageEl.textContent = 'CLICK!';
  messageEl.hidden = false;
  resultTimeEl.hidden = true;
  ratingEl.hidden = true;
  resultActionsEl.hidden = true;
  shareBtn.hidden = true;
  readyAt = performance.now();
  playArea.setAttribute('aria-label', 'Click now');
}

function showTooSoon(): void {
  state = 'too_soon';
  setStateClass('too-soon');
  messageEl.textContent = 'Too soon! 🤚';
  messageEl.hidden = false;
  resultTimeEl.hidden = true;
  ratingEl.hidden = true;
  resultActionsEl.hidden = false;
  shareBtn.hidden = true;
  playArea.setAttribute('aria-label', 'Too soon — try again');
}

function showResult(ms: number): void {
  state = 'result';
  setStateClass('result');
  messageEl.hidden = false;
  resultTimeEl.textContent = formatMs(ms);
  resultTimeEl.hidden = false;
  ratingEl.textContent = getRating(ms);
  ratingEl.hidden = false;
  resultActionsEl.hidden = false;
  shareBtn.hidden = false;
  playArea.setAttribute('aria-label', `Reaction time ${ms} milliseconds`);
  void loadLeaderboard();
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function renderLbRows(rows: ScoreRow[], currentNickname: string): void {
  if (!rows.length) {
    lbList.innerHTML = '<li class="lb-empty">No scores yet. Be the first!</li>';
    return;
  }
  const lcNick = (currentNickname || '').toLowerCase();
  const parts: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isYou = !!lcNick && (r.nickname || '').toLowerCase() === lcNick;
    const value = formatGameValue('reaction-timer', r);
    parts.push(
      `<li class="${isYou ? 'is-you' : ''}">` +
        `<span class="lb-rank">#${i + 1}</span>` +
        `<span class="lb-name">${escapeHtml(r.nickname || '')}</span>` +
        `<span class="lb-value">${escapeHtml(value)}</span>` +
        `</li>`,
    );
  }
  lbList.innerHTML = parts.join('');
}

async function loadLeaderboard(): Promise<void> {
  lbList.setAttribute('aria-busy', 'true');
  lbList.innerHTML = '<li class="lb-empty">Loading…</li>';
  const res = await fetchTop100('reaction-timer');
  lbList.setAttribute('aria-busy', 'false');
  if (res.error) {
    lbList.innerHTML = `<li class="lb-error">Couldn't load leaderboard.</li>`;
    return;
  }
  const nick = (lbNickname.value || '').trim() || lastSubmittedNick || loadGuestNickname();
  renderLbRows(res.data, nick);
}

async function handleSubmit(): Promise<void> {
  const nick = (lbNickname.value || '').trim();
  if (nick.length < 1 || nick.length > 12) {
    lbStatus.textContent = 'Nickname must be 1-12 characters.';
    lbStatus.classList.add('is-error');
    return;
  }
  if (lastMs == null) {
    lbStatus.textContent = 'No score yet — play first.';
    lbStatus.classList.add('is-error');
    return;
  }
  lbStatus.classList.remove('is-error');
  lbStatus.textContent = 'Submitting…';
  lbSubmit.disabled = true;
  const res = await submitScore({
    game: 'reaction-timer',
    nickname: nick,
    reactionTime: lastMs,
  });
  lbSubmit.disabled = false;
  if (res.ok) {
    lastSubmittedNick = nick;
    saveGuestNickname(nick);
    lbStatus.classList.remove('is-error');
    lbStatus.textContent = '✓ Submitted!';
    await loadLeaderboard();
  } else {
    lbStatus.classList.add('is-error');
    lbStatus.textContent = "Couldn't submit — try again.";
  }
}

function handlePlayAreaClick(e: Event): void {
  e.preventDefault();
  if (state === 'idle') {
    startWaiting();
  } else if (state === 'waiting') {
    clearWaitTimer();
    showTooSoon();
  } else if (state === 'ready') {
    const ms = Math.round(performance.now() - readyAt);
    lastMs = ms;
    tries += 1;
    const newBest = isNewBest(bestMs, ms);
    if (newBest) {
      bestMs = ms;
      saveBestMs(bestMs);
    }
    renderStats();
    messageEl.textContent = newBest ? 'New best! 🎉' : 'Your time';
    showResult(ms);
  }
}

function handleShare(): void {
  if (lastMs == null) return;
  const url = `${window.location.origin}${SHARE_PATH}`;
  const text = `I got ${lastMs} ms on Reaction Timer ⚡ Can you beat me? ${url}`;
  void copyToClipboard(text).then(
    () => showCopiedToast('Copied to clipboard!'),
    () => showCopiedToast("Couldn't copy — try again"),
  );
}

function handleResetBest(): void {
  if (!window.confirm('Reset best reaction time and tries?')) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  bestMs = null;
  tries = 0;
  renderStats();
  if (state === 'result' && lastMs != null) {
    messageEl.textContent = 'Your time';
  }
  showCopiedToast('Best reset');
}

function init(): void {
  const nick = loadGuestNickname();
  if (nick) lbNickname.value = nick;
  renderStats();
  showIdle();
  playArea.addEventListener('click', handlePlayAreaClick);
  tryAgainBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showIdle();
  });
  shareBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleShare();
  });
  resetBestBtn?.addEventListener('click', handleResetBest);
  lbSubmit.addEventListener('click', () => {
    void handleSubmit();
  });
}

init();
