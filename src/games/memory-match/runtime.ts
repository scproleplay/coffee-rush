import {
  fetchTop100,
  formatGameValue,
  leaderboardErrorMessage,
  submitScore,
  type ScoreRow,
} from '@shared/leaderboard/client';
import { loadGuestNickname, saveGuestNickname } from '@shared/auth/session';
import {
  CHECK_DELAY_MS,
  STORAGE_KEY_MOVES,
  STORAGE_KEY_TIME,
  SYMBOLS,
  TIMER_TICK_MS,
  TOTAL_PAIRS,
} from './config';
import {
  buildDeck,
  formatMs,
  isBetterMoves,
  isBetterTime,
  isMatch,
} from './systems/deck';

function must<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as unknown as T;
}

function loadNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function saveNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

const gridEl = must<HTMLElement>('memoryGrid');
const movesEl = must<HTMLElement>('mmMoves');
const timeEl = must<HTMLElement>('mmTime');
const bestMovesEl = must<HTMLElement>('mmBestMoves');
const bestTimeEl = must<HTMLElement>('mmBestTime');
const newGameBtn = must<HTMLButtonElement>('mmNewGame');
const winScreenEl = must<HTMLElement>('mmWinScreen');
const winCurrentTimeEl = must<HTMLElement>('mmWinCurrentTime');
const winCurrentMovesEl = must<HTMLElement>('mmWinCurrentMoves');
const winBestTimeVal = must<HTMLElement>('mmWinBestTime');
const winBestMovesVal = must<HTMLElement>('mmWinBestMoves');
const winBestTimeBadge = must<HTMLElement>('mmWinBestTimeBadge');
const winBestMovesBadge = must<HTMLElement>('mmWinBestMovesBadge');
const tryAgainBtn = must<HTMLButtonElement>('mmTryAgain');
const resetBestBtn = document.getElementById('mmResetBest') as HTMLButtonElement | null;
const lbList = must<HTMLElement>('lbListMM');
const lbNickname = must<HTMLInputElement>('lbNicknameMM');
const lbSubmit = must<HTMLButtonElement>('lbSubmitMM');
const lbStatus = must<HTMLElement>('lbStatusMM');

let deck: string[] = [];
let flipped: HTMLButtonElement[] = [];
let matchedCount = 0;
let moves = 0;
let elapsedMs = 0;
let timerId: ReturnType<typeof setInterval> | null = null;
let timerStart = 0;
let gameStarted = false;
let checking = false;
let bestMoves = loadNumber(STORAGE_KEY_MOVES);
let bestMs = loadNumber(STORAGE_KEY_TIME);
let lastSubmittedNick = '';

function formatMoves(n: number | null): string {
  return n == null ? '—' : String(n);
}

function newGame(): void {
  stopTimer();
  matchedCount = 0;
  moves = 0;
  elapsedMs = 0;
  gameStarted = false;
  checking = false;
  flipped = [];
  deck = buildDeck(SYMBOLS);
  renderGrid();
  renderStats();
  winScreenEl.hidden = true;
}

function renderGrid(): void {
  gridEl.innerHTML = '';
  for (let i = 0; i < deck.length; i++) {
    const symbol = deck[i];
    const card = document.createElement('button');
    card.className = 'memory-card';
    card.type = 'button';
    card.setAttribute('data-symbol', symbol);
    card.setAttribute('aria-label', `Card ${i + 1} face down`);
    card.disabled = false;

    const back = document.createElement('span');
    back.className = 'memory-card-face memory-card-back';
    back.setAttribute('aria-hidden', 'true');
    back.textContent = '?';

    const front = document.createElement('span');
    front.className = 'memory-card-face memory-card-front';
    front.setAttribute('aria-hidden', 'true');
    front.textContent = symbol;

    card.append(back, front);
    card.addEventListener('click', onCardClick);
    gridEl.appendChild(card);
  }
}

function onCardClick(e: Event): void {
  const card = e.currentTarget as HTMLButtonElement;
  if (checking) return;
  if (card.classList.contains('is-flipped')) return;
  if (card.classList.contains('is-matched')) return;

  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  }

  card.classList.add('is-flipped');
  const symbol = card.getAttribute('data-symbol');
  card.setAttribute('aria-label', `Card showing ${symbol}`);
  flipped.push(card);

  if (flipped.length === 2) {
    moves += 1;
    renderStats();
    checking = true;
    const a = flipped[0];
    const b = flipped[1];
    if (isMatch(a.getAttribute('data-symbol'), b.getAttribute('data-symbol'))) {
      lockMatch(a, b);
    } else {
      setTimeout(() => {
        if (!checking) return;
        a.classList.remove('is-flipped');
        b.classList.remove('is-flipped');
        a.setAttribute('aria-label', 'Card face down');
        b.setAttribute('aria-label', 'Card face down');
        flipped = [];
        checking = false;
      }, CHECK_DELAY_MS);
    }
  }
}

function lockMatch(a: HTMLButtonElement, b: HTMLButtonElement): void {
  a.classList.add('is-matched');
  b.classList.add('is-matched');
  a.disabled = true;
  b.disabled = true;
  flipped = [];
  checking = false;
  matchedCount += 1;
  if (matchedCount === TOTAL_PAIRS) win();
}

function startTimer(): void {
  timerStart = performance.now();
  elapsedMs = 0;
  timeEl.textContent = formatMs(0);
  timerId = setInterval(() => {
    elapsedMs = performance.now() - timerStart;
    timeEl.textContent = formatMs(elapsedMs);
  }, TIMER_TICK_MS);
}

function stopTimer(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function renderStats(): void {
  movesEl.textContent = String(moves);
  timeEl.textContent = formatMs(elapsedMs);
  bestMovesEl.textContent = formatMoves(bestMoves);
  bestTimeEl.textContent = bestMs == null ? '—' : formatMs(bestMs);
}

function win(): void {
  stopTimer();
  const finalMs = Math.round(elapsedMs);
  const newMoves = isBetterMoves(bestMoves, moves);
  const newTime = isBetterTime(bestMs, finalMs);
  if (newMoves) {
    bestMoves = moves;
    saveNumber(STORAGE_KEY_MOVES, bestMoves);
  }
  if (newTime) {
    bestMs = finalMs;
    saveNumber(STORAGE_KEY_TIME, bestMs);
  }
  renderStats();

  winCurrentMovesEl.textContent = String(moves);
  winCurrentTimeEl.textContent = formatMs(finalMs);
  winBestMovesVal.textContent = formatMoves(bestMoves);
  winBestTimeVal.textContent = bestMs == null ? '—' : formatMs(bestMs);
  winBestMovesBadge.hidden = !newMoves;
  winBestTimeBadge.hidden = !newTime;
  winScreenEl.hidden = false;
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
    const value = formatGameValue('memory-match', r);
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
  const res = await fetchTop100('memory-match');
  lbList.setAttribute('aria-busy', 'false');
  if (res.error) {
    lbList.innerHTML = `<li class="lb-error">${leaderboardErrorMessage(res.error)}</li>`;
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
  lbStatus.classList.remove('is-error');
  lbStatus.textContent = 'Submitting…';
  lbSubmit.disabled = true;
  const res = await submitScore({
    game: 'memory-match',
    nickname: nick,
    moves,
    timeSeconds: Math.round(elapsedMs),
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
    lbStatus.textContent = leaderboardErrorMessage(res.error) || "Couldn't submit — try again.";
  }
}

function handleResetBest(): void {
  if (!window.confirm('Reset best moves and best time?')) return;
  try {
    localStorage.removeItem(STORAGE_KEY_MOVES);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(STORAGE_KEY_TIME);
  } catch {
    /* ignore */
  }
  bestMoves = null;
  bestMs = null;
  renderStats();
}

function init(): void {
  const nick = loadGuestNickname();
  if (nick) lbNickname.value = nick;
  newGame();
  newGameBtn.addEventListener('click', newGame);
  tryAgainBtn.addEventListener('click', newGame);
  resetBestBtn?.addEventListener('click', handleResetBest);
  lbSubmit.addEventListener('click', () => {
    void handleSubmit();
  });
}

init();
