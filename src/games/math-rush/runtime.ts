import {
  fetchTop100,
  formatGameValue,
  leaderboardErrorMessage,
  submitScore,
  type ScoreRow,
} from '@shared/leaderboard/client';
import { loadBest, saveBest } from '@shared/storage/bestScore';
import { loadGuestNickname, saveGuestNickname } from '@shared/auth/session';
import {
  CORRECT_FEEDBACK_MS,
  DIFFICULTIES,
  GAME_DURATION_SEC,
  SHARE_PATH,
  STORAGE_KEY,
  WRONG_RETRY_MS,
  type MathDifficultyKey,
} from './config';
import {
  generateQuestion,
  isCorrectGuess,
  parseGuess,
  type MathQuestion,
} from './systems/questions';

function must<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as unknown as T;
}

const welcomeEl = must<HTMLElement>('mathWelcome');
const gameUiEl = must<HTMLElement>('mathGameUI');
const gameOverEl = must<HTMLElement>('mathGameOver');
const scoreEl = must<HTMLElement>('mathScore');
const timeEl = must<HTMLElement>('mathTime');
const correctEl = must<HTMLElement>('mathCorrect');
const wrongEl = must<HTMLElement>('mathWrong');
const questionEl = must<HTMLElement>('mathQuestion');
const inputEl = must<HTMLInputElement>('mathInput');
const submitBtn = must<HTMLButtonElement>('mathSubmit');
const feedbackEl = must<HTMLElement>('mathFeedback');
const keypadEl = must<HTMLElement>('mathKeypad');
const difficultyBadge = must<HTMLElement>('mathDifficultyBadge');
const finalScoreEl = must<HTMLElement>('mathFinalScore');
const finalBestEl = must<HTMLElement>('mathFinalBest');
const finalCorrectEl = must<HTMLElement>('mathFinalCorrect');
const finalWrongEl = must<HTMLElement>('mathFinalWrong');
const newBestBadgeEl = must<HTMLElement>('mathNewBestBadge');
const bestScoreEl = must<HTMLElement>('mathBestScore');
const startGameBtn = must<HTMLButtonElement>('mathStart');
const playAgainBtn = must<HTMLButtonElement>('mathPlayAgain');
const mainMenuBtn = must<HTMLButtonElement>('mathMainMenu');
const shareFinalBtn = must<HTMLButtonElement>('mathShareFinal');
const difficultyBtns = document.querySelectorAll<HTMLButtonElement>('.difficulty-btn');
const copiedToastEl = must<HTMLElement>('mathCopiedToast');
const resetBestBtn = document.getElementById('mathResetBest') as HTMLButtonElement | null;
const lbList = must<HTMLElement>('lbListMath');
const lbNickname = must<HTMLInputElement>('lbNicknameMath');
const lbSubmit = must<HTMLButtonElement>('lbSubmitMath');
const lbStatus = must<HTMLElement>('lbStatusMath');

let currentDifficulty: MathDifficultyKey = 'normal';
let score = 0;
let correct = 0;
let wrong = 0;
let timeLeft = GAME_DURATION_SEC;
let question: MathQuestion | null = null;
let timerId: ReturnType<typeof setInterval> | null = null;
let wrongRetryTimerId: ReturnType<typeof setTimeout> | null = null;
let feedbackTimerId: ReturnType<typeof setTimeout> | null = null;
let bestScore = loadBest(STORAGE_KEY);
let isPlaying = false;
let isAnswered = false;
let lastSubmittedNick = '';

function showCopiedToast(text: string): void {
  copiedToastEl.textContent = text;
  copiedToastEl.classList.add('show');
  setTimeout(() => copiedToastEl.classList.remove('show'), 1600);
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

function showWelcome(): void {
  isPlaying = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  clearWrongRetry();
  clearFeedbackTimer();
  welcomeEl.hidden = false;
  gameUiEl.hidden = true;
  gameOverEl.hidden = true;
  bestScoreEl.textContent = String(bestScore);
}

function showGame(): void {
  welcomeEl.hidden = true;
  gameOverEl.hidden = true;
  gameUiEl.hidden = false;
}

function showGameOver(): void {
  isPlaying = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  clearWrongRetry();
  clearFeedbackTimer();

  const isNewBest = score > bestScore;
  if (isNewBest) bestScore = saveBest(STORAGE_KEY, score);
  finalScoreEl.textContent = String(score);
  finalBestEl.textContent = String(bestScore);
  finalCorrectEl.textContent = String(correct);
  finalWrongEl.textContent = String(wrong);
  newBestBadgeEl.hidden = !isNewBest;

  gameUiEl.hidden = true;
  welcomeEl.hidden = true;
  gameOverEl.hidden = false;
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
    const value = formatGameValue('math-rush', r);
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
  const res = await fetchTop100('math-rush');
  lbList.setAttribute('aria-busy', 'false');
  if (res.error) {
    lbList.innerHTML = `<li class="lb-error">${leaderboardErrorMessage(res.error)}</li>`;
    return;
  }
  const nick = (lbNickname.value || '').trim() || lastSubmittedNick || loadGuestNickname();
  renderLbRows(res.data, nick);
}

async function handleSubmitLb(): Promise<void> {
  const nick = (lbNickname.value || '').trim();
  if (nick.length < 1 || nick.length > 12) {
    lbStatus.textContent = 'Nickname must be 1-12 characters.';
    lbStatus.classList.add('is-error');
    return;
  }
  lbStatus.classList.remove('is-error');
  lbStatus.textContent = 'Submitting…';
  lbSubmit.disabled = true;
  const res = await submitScore({ game: 'math-rush', nickname: nick, score });
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

function selectDifficulty(key: string): void {
  if (!(key in DIFFICULTIES)) return;
  currentDifficulty = key as MathDifficultyKey;
  difficultyBtns.forEach((b) => {
    const isSel = b.getAttribute('data-difficulty') === key;
    b.classList.toggle('selected', isSel);
    b.setAttribute('aria-checked', isSel ? 'true' : 'false');
  });
}

function startGame(): void {
  if (isPlaying) return;
  score = 0;
  correct = 0;
  wrong = 0;
  timeLeft = GAME_DURATION_SEC;
  isPlaying = true;
  isAnswered = false;
  difficultyBadge.textContent = DIFFICULTIES[currentDifficulty].label;
  updateScore();
  updateTime();
  updateCounters();
  setFeedback('', '');
  showGame();
  nextQuestion();
  timerId = setInterval(tick, 1000);
}

function tick(): void {
  timeLeft -= 1;
  updateTime();
  if (timeLeft <= 0) endGame();
}

function endGame(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  showGameOver();
}

function nextQuestion(): void {
  isAnswered = false;
  question = generateQuestion(currentDifficulty);
  questionEl.textContent = question.text;
  inputEl.value = '';
  setFeedback('', '');
  setTimeout(() => inputEl.focus(), 0);
}

function handleSubmitAnswer(): void {
  if (!isPlaying || isAnswered || !question) return;
  const guess = parseGuess(inputEl.value);
  if (guess == null) return;
  if (isCorrectGuess(guess, question.answer)) handleCorrect();
  else handleWrong();
}

function handleCorrect(): void {
  isAnswered = true;
  const pts = DIFFICULTIES[currentDifficulty].points;
  score += pts;
  correct += 1;
  clearWrongRetry();
  updateScore();
  updateCounters();
  setFeedback(`✓ Correct! +${pts}`, 'is-correct');
  if (feedbackTimerId) clearTimeout(feedbackTimerId);
  feedbackTimerId = setTimeout(() => {
    feedbackTimerId = null;
    if (isPlaying) nextQuestion();
  }, CORRECT_FEEDBACK_MS);
}

function handleWrong(): void {
  wrong += 1;
  updateCounters();
  setFeedback('✗ Try again', 'is-wrong');
  clearWrongRetry();
  wrongRetryTimerId = setTimeout(() => {
    wrongRetryTimerId = null;
    if (isPlaying && !isAnswered) {
      isAnswered = true;
      setFeedback('→ Skipped', 'is-wrong');
      if (feedbackTimerId) clearTimeout(feedbackTimerId);
      feedbackTimerId = setTimeout(() => {
        feedbackTimerId = null;
        if (isPlaying) nextQuestion();
      }, CORRECT_FEEDBACK_MS);
    }
  }, WRONG_RETRY_MS);
}

function clearWrongRetry(): void {
  if (wrongRetryTimerId) {
    clearTimeout(wrongRetryTimerId);
    wrongRetryTimerId = null;
  }
}

function clearFeedbackTimer(): void {
  if (feedbackTimerId) {
    clearTimeout(feedbackTimerId);
    feedbackTimerId = null;
  }
}

function updateScore(): void {
  scoreEl.textContent = String(score);
}
function updateTime(): void {
  timeEl.textContent = String(timeLeft);
}
function updateCounters(): void {
  correctEl.textContent = String(correct);
  wrongEl.textContent = String(wrong);
}
function setFeedback(text: string, cls: string): void {
  feedbackEl.textContent = text;
  feedbackEl.classList.remove('is-correct', 'is-wrong');
  if (cls) feedbackEl.classList.add(cls);
}

function handleKeypadTap(e: Event): void {
  const btn = (e.target as HTMLElement).closest('.keypad-btn') as HTMLElement | null;
  if (!btn) return;
  const key = btn.getAttribute('data-key');
  const action = btn.getAttribute('data-action');
  if (action === 'backspace') {
    e.preventDefault();
    inputEl.value = inputEl.value.slice(0, -1);
    inputEl.focus();
  } else if (action === 'submit') {
    e.preventDefault();
    handleSubmitAnswer();
  } else if (key != null) {
    if (isAnswered) return;
    inputEl.value = (inputEl.value + key).slice(0, 6);
    inputEl.focus();
  }
}

function handleShare(): void {
  const url = `${window.location.origin}${SHARE_PATH}`;
  const text = `I scored ${score} in Math Rush ➕ Can you beat me? ${url}`;
  void copyToClipboard(text).then(
    () => showCopiedToast('Copied to clipboard!'),
    () => showCopiedToast("Couldn't copy — try again"),
  );
}

function handleResetBest(): void {
  if (!window.confirm('Reset best score?')) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  bestScore = 0;
  bestScoreEl.textContent = '0';
  showCopiedToast('Best reset');
}

function init(): void {
  const nick = loadGuestNickname();
  if (nick) lbNickname.value = nick;
  bestScoreEl.textContent = String(bestScore);
  selectDifficulty('normal');
  showWelcome();
  keypadEl.addEventListener('click', handleKeypadTap);

  startGameBtn.addEventListener('click', startGame);
  playAgainBtn.addEventListener('click', startGame);
  mainMenuBtn.addEventListener('click', showWelcome);
  shareFinalBtn.addEventListener('click', handleShare);
  submitBtn.addEventListener('click', handleSubmitAnswer);
  resetBestBtn?.addEventListener('click', handleResetBest);
  lbSubmit.addEventListener('click', () => {
    void handleSubmitLb();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitAnswer();
    }
  });
  inputEl.addEventListener('input', () => {
    const cleaned = inputEl.value.replace(/[^0-9]/g, '').slice(0, 6);
    if (cleaned !== inputEl.value) inputEl.value = cleaned;
  });

  difficultyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-difficulty');
      if (key) selectDifficulty(key);
    });
  });
}

init();
