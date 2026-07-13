/**
 * Coffee Rush runtime — DOM wire-up. Pure rules live in systems/*.
 */
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
  ACHIEVEMENTS,
  ACHIEVEMENTS_KEY,
  COMBO_BURST_THRESHOLD,
  COMBO_WINDOW_MS,
  COUNTDOWN_SECONDS,
  DIFFICULTIES,
  SHARE_PATH,
  SOUND_KEY,
  STORAGE_KEY,
  type AchievementDef,
  type DifficultyKey,
} from './config';
import { evaluateUnlocks, loadAchievementIds, serializeAchievements } from './systems/achievements';
import { rankFor } from './systems/ranks';
import { nextCombo, rollGolden, totalPoints } from './systems/scoring';
import { createRushAudio } from './ui/audio';
import { getRushDom } from './ui/domRefs';

const dom = getRushDom();
const audio = createRushAudio(() => soundOn);

let score = 0;
let timeLeft = 0;
let gameDuration = 30;
let currentDifficulty: DifficultyKey = 'normal';
let isPlaying = false;
let isGolden = false;
let timerId: ReturnType<typeof setInterval> | null = null;
let countdownId: ReturnType<typeof setTimeout> | null = null;
let cupTimeoutId: ReturnType<typeof setTimeout> | null = null;
let copiedTimerId: ReturnType<typeof setTimeout> | null = null;
let bestScore = loadBest(STORAGE_KEY);
let soundOn = loadSoundPref();
let combo = 0;
let lastClickAt = 0;
let comboResetTimerId: ReturnType<typeof setTimeout> | null = null;
let goldenCupsCaught = 0;
let unlockedAchievements = loadAchievements();
let achievementToastTimerId: ReturnType<typeof setTimeout> | null = null;
let lastSubmittedNick = '';

if (dom.sparklesEl && !dom.sparklesEl.children.length) {
  for (let i = 1; i <= 4; i++) {
    const s = document.createElement('span');
    s.className = `spark spark-${i}`;
    s.textContent = '✨';
    dom.sparklesEl.appendChild(s);
  }
}

function loadSoundPref(): boolean {
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    if (raw == null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

function saveSoundPref(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function loadAchievements(): Set<string> {
  try {
    return loadAchievementIds(localStorage.getItem(ACHIEVEMENTS_KEY));
  } catch {
    return new Set();
  }
}

function saveAchievements(set: Set<string>): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, serializeAchievements(set));
  } catch {
    /* ignore */
  }
}

function resetProgress(): void {
  if (!window.confirm('Reset best score and all unlocked achievements?')) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(ACHIEVEMENTS_KEY);
  } catch {
    /* ignore */
  }
  bestScore = 0;
  unlockedAchievements = new Set();
  dom.welcomeBestEl.textContent = '0';
  showCopiedToast('Progress reset');
}

function setMessage(text: string, win: boolean): void {
  dom.messageEl.textContent = text || '';
  dom.messageEl.classList.toggle('win', win);
}

function showCopiedToast(text: string): void {
  dom.copiedToast.textContent = text;
  dom.copiedToast.classList.add('show');
  if (copiedTimerId) clearTimeout(copiedTimerId);
  copiedTimerId = setTimeout(() => {
    dom.copiedToast.classList.remove('show');
  }, 1600);
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

function updateScore(): void {
  dom.scoreEl.textContent = String(score);
}
function updateTime(): void {
  dom.timeEl.textContent = String(timeLeft);
}
function updateCombo(): void {
  dom.comboEl.textContent = `x${combo || 1}`;
}

function placeCupCenter(): void {
  const area = dom.playArea.getBoundingClientRect();
  const cupSize = dom.cup.offsetWidth || 90;
  const x = (area.width - cupSize) / 2;
  const y = (area.height - cupSize) / 2;
  dom.cup.style.left = `${x}px`;
  dom.cup.style.top = `${y}px`;
}

function moveCupRandom(): void {
  const area = dom.playArea.getBoundingClientRect();
  const cupSize = dom.cup.offsetWidth || 90;
  const padding = 10;
  const maxX = Math.max(0, area.width - cupSize - padding);
  const maxY = Math.max(0, area.height - cupSize - padding);
  const x = padding + Math.random() * maxX;
  const y = padding + Math.random() * maxY;
  dom.cup.style.left = `${x}px`;
  dom.cup.style.top = `${y}px`;
  isGolden = rollGolden();
  dom.cup.classList.toggle('golden', isGolden);
}

function applyCupSize(diffKey: DifficultyKey): void {
  const cfg = DIFFICULTIES[diffKey];
  dom.cup.classList.remove('size-easy', 'size-hard', 'size-insane', 'insane');
  if (cfg.cupSize) dom.cup.classList.add(cfg.cupSize);
  if (cfg.insane) dom.cup.classList.add('insane');
}

function spawnFloatText(points: number): void {
  const el = document.createElement('span');
  el.className = `float-text plus${points}`;
  el.textContent = `+${points}`;
  const areaRect = dom.playArea.getBoundingClientRect();
  const cupRect = dom.cup.getBoundingClientRect();
  const x = cupRect.left - areaRect.left + cupRect.width / 2;
  const y = cupRect.top - areaRect.top + cupRect.height / 2;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  dom.playArea.appendChild(el);
  el.addEventListener('animationend', () => {
    el.parentNode?.removeChild(el);
  });
}

function spawnComboBurst(level: number): void {
  const el = document.createElement('div');
  el.className = `combo-burst${level >= 5 ? ' x-high' : ''}`;
  el.textContent = `Combo x${level}!`;
  dom.playArea.appendChild(el);
  el.addEventListener('animationend', () => {
    el.parentNode?.removeChild(el);
  });
}

function showWelcome(): void {
  cancelCountdown();
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  clearCupTimeout();
  isPlaying = false;
  combo = 0;
  lastClickAt = 0;
  if (comboResetTimerId) {
    clearTimeout(comboResetTimerId);
    comboResetTimerId = null;
  }

  dom.welcomeBestEl.textContent = String(bestScore);
  dom.welcomeScreen.hidden = false;
  dom.gameUI.hidden = true;
  dom.gameOverScreen.hidden = true;
  dom.achievementToastEl.hidden = true;
  if (achievementToastTimerId) {
    clearTimeout(achievementToastTimerId);
    achievementToastTimerId = null;
  }
}

function showGame(): void {
  dom.welcomeScreen.hidden = true;
  dom.gameOverScreen.hidden = true;
  dom.gameUI.hidden = false;
}

function showGameOver(newlyUnlocked: AchievementDef[]): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  isPlaying = false;
  dom.playArea.classList.add('disabled');

  dom.finalScoreEl.textContent = String(score);
  dom.finalBestEl.textContent = String(bestScore);
  const rank = rankFor(score);
  dom.rankEmojiEl.textContent = rank.emoji;
  dom.rankNameEl.textContent = rank.name;

  renderAchievements(newlyUnlocked);
  dom.gameUI.hidden = true;
  dom.welcomeScreen.hidden = true;
  dom.gameOverScreen.hidden = false;
  void loadLeaderboard();
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function renderLbRows(rows: ScoreRow[], currentNickname: string): void {
  if (!rows.length) {
    dom.lbList.innerHTML = '<li class="lb-empty">No scores yet. Be the first!</li>';
    return;
  }
  const lcNick = (currentNickname || '').toLowerCase();
  const parts: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isYou = !!lcNick && (r.nickname || '').toLowerCase() === lcNick;
    const value = formatGameValue('coffee-rush', r);
    parts.push(
      `<li class="${isYou ? 'is-you' : ''}">` +
        `<span class="lb-rank">#${i + 1}</span>` +
        `<span class="lb-name">${escapeHtml(r.nickname || '')}</span>` +
        `<span class="lb-value">${escapeHtml(value)}</span>` +
        `</li>`,
    );
  }
  dom.lbList.innerHTML = parts.join('');
}

async function loadLeaderboard(): Promise<void> {
  dom.lbList.setAttribute('aria-busy', 'true');
  dom.lbList.innerHTML = '<li class="lb-empty">Loading…</li>';
  const res = await fetchTop100('coffee-rush');
  dom.lbList.setAttribute('aria-busy', 'false');
  if (res.error) {
    dom.lbList.innerHTML = `<li class="lb-error">${leaderboardErrorMessage(res.error)}</li>`;
    return;
  }
  const currentNick = (dom.lbNickname.value || '').trim() || lastSubmittedNick || loadGuestNickname();
  renderLbRows(res.data, currentNick);
}

async function handleSubmit(): Promise<void> {
  const nick = (dom.lbNickname.value || '').trim();
  if (nick.length < 1 || nick.length > 12) {
    dom.lbStatus.textContent = 'Nickname must be 1-12 characters.';
    dom.lbStatus.classList.add('is-error');
    return;
  }
  dom.lbStatus.classList.remove('is-error');
  dom.lbStatus.textContent = 'Submitting…';
  dom.lbSubmit.disabled = true;
  const res = await submitScore({ game: 'coffee-rush', nickname: nick, score });
  dom.lbSubmit.disabled = false;
  if (res.ok) {
    lastSubmittedNick = nick;
    saveGuestNickname(nick);
    dom.lbStatus.classList.remove('is-error');
    dom.lbStatus.textContent = '✓ Submitted!';
    await loadLeaderboard();
  } else {
    dom.lbStatus.classList.add('is-error');
    dom.lbStatus.textContent = leaderboardErrorMessage(res.error) || "Couldn't submit — try again.";
  }
}

function renderAchievements(newlyUnlocked: AchievementDef[]): void {
  dom.achievementsListEl.innerHTML = '';
  const newlyUnlockedIds = new Set(newlyUnlocked.map((a) => a.id));

  for (const a of ACHIEVEMENTS) {
    const isUnlocked = unlockedAchievements.has(a.id);
    const isNew = newlyUnlockedIds.has(a.id);
    const li = document.createElement('li');
    li.className = `achievement-tile ${isUnlocked ? 'unlocked' : 'locked'}${isNew ? ' newly-unlocked' : ''}`;
    li.title = a.desc;
    li.setAttribute(
      'aria-label',
      `${isUnlocked ? 'Unlocked' : 'Locked'}: ${a.name} — ${a.desc}`,
    );

    const emojiEl = document.createElement('span');
    emojiEl.className = 'achievement-emoji';
    emojiEl.textContent = a.emoji;
    li.appendChild(emojiEl);

    const nameEl = document.createElement('span');
    nameEl.className = 'achievement-name';
    nameEl.textContent = a.name;
    li.appendChild(nameEl);

    const reqEl = document.createElement('span');
    reqEl.className = 'achievement-req';
    reqEl.textContent = a.desc;
    li.appendChild(reqEl);

    dom.achievementsListEl.appendChild(li);
  }

  dom.achievementsCountEl.textContent = `${unlockedAchievements.size}/${ACHIEVEMENTS.length}`;

  if (newlyUnlocked.length > 0) {
    dom.achievementToastEl.textContent = `🏆 Unlocked: ${newlyUnlocked.map((a) => a.name).join(' · ')}`;
    dom.achievementToastEl.hidden = false;
    dom.achievementToastEl.style.animation = 'none';
    void dom.achievementToastEl.offsetWidth;
    dom.achievementToastEl.style.animation = '';
    if (achievementToastTimerId) clearTimeout(achievementToastTimerId);
    achievementToastTimerId = setTimeout(() => {
      dom.achievementToastEl.hidden = true;
      achievementToastTimerId = null;
    }, 3500);
  } else {
    dom.achievementToastEl.hidden = true;
  }
}

function selectDifficulty(key: string): void {
  if (!(key in DIFFICULTIES)) return;
  currentDifficulty = key as DifficultyKey;
  dom.difficultyBtns.forEach((b) => {
    const isSel = b.getAttribute('data-difficulty') === key;
    b.classList.toggle('selected', isSel);
    b.setAttribute('aria-checked', isSel ? 'true' : 'false');
  });
}

function cancelCountdown(): void {
  if (countdownId) {
    clearTimeout(countdownId);
    countdownId = null;
  }
  dom.countdownEl.hidden = true;
}

function clearCupTimeout(): void {
  if (cupTimeoutId) {
    clearTimeout(cupTimeoutId);
    cupTimeoutId = null;
  }
}

function armCupTimeout(ms: number): void {
  clearCupTimeout();
  if (!isPlaying) return;
  cupTimeoutId = setTimeout(() => {
    cupTimeoutId = null;
    if (!isPlaying) return;
    combo = 0;
    updateCombo();
    lastClickAt = 0;
    if (comboResetTimerId) {
      clearTimeout(comboResetTimerId);
      comboResetTimerId = null;
    }
    moveCupRandom();
    armCupTimeout(ms);
  }, ms);
}

function runCountdown(onDone: () => void): void {
  cancelCountdown();
  dom.countdownEl.hidden = false;
  let i = 0;
  function showNext(): void {
    if (i >= COUNTDOWN_SECONDS.length) {
      dom.countdownEl.hidden = true;
      onDone();
      return;
    }
    const label = COUNTDOWN_SECONDS[i];
    dom.countdownText.textContent = label;
    dom.countdownText.classList.toggle('go', label === 'GO!');
    dom.countdownText.style.animation = 'none';
    void dom.countdownText.offsetWidth;
    dom.countdownText.style.animation = '';
    if (label === 'GO!') audio.playGo();
    else audio.playCountdown();
    i++;
    countdownId = setTimeout(showNext, 1000);
  }
  showNext();
}

function startGame(): void {
  if (isPlaying) return;
  const cfg = DIFFICULTIES[currentDifficulty];
  gameDuration = cfg.duration;
  timeLeft = gameDuration;
  score = 0;
  combo = 0;
  lastClickAt = 0;
  goldenCupsCaught = 0;
  if (comboResetTimerId) {
    clearTimeout(comboResetTimerId);
    comboResetTimerId = null;
  }
  clearCupTimeout();

  applyCupSize(currentDifficulty);
  dom.difficultyBadge.textContent = cfg.label;
  updateScore();
  updateTime();
  updateCombo();
  setMessage('Get ready…', false);
  showGame();
  placeCupCenter();

  dom.playArea.classList.add('disabled');
  dom.cup.classList.remove('golden');

  runCountdown(() => {
    isPlaying = true;
    dom.playArea.classList.remove('disabled');
    setMessage('Go! Tap the cup! ☕', false);
    moveCupRandom();
    armCupTimeout(cfg.cupTimeoutMs);
    timerId = setInterval(tick, 1000);
  });
}

function tick(): void {
  timeLeft--;
  updateTime();
  if (timeLeft <= 0) endGame();
}

function endGame(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  clearCupTimeout();
  isPlaying = false;
  if (comboResetTimerId) {
    clearTimeout(comboResetTimerId);
    comboResetTimerId = null;
  }

  if (score > bestScore) {
    bestScore = saveBest(STORAGE_KEY, score);
  }

  const gameStats = { score, goldenCups: goldenCupsCaught };
  const newlyUnlocked = evaluateUnlocks(gameStats, unlockedAchievements);
  for (const a of newlyUnlocked) unlockedAchievements.add(a.id);
  if (newlyUnlocked.length > 0) {
    saveAchievements(unlockedAchievements);
    setTimeout(() => audio.playClick({ type: 'triangle', freq: 880, freqEnd: 1320, peak: 0.18, dur: 0.08 }), 0);
    setTimeout(() => audio.playClick({ type: 'triangle', freq: 1175, freqEnd: 1760, peak: 0.18, dur: 0.08 }), 110);
    setTimeout(() => audio.playClick({ type: 'triangle', freq: 1568, freqEnd: 2349, peak: 0.2, dur: 0.18 }), 220);
  }

  audio.playEnd();
  showGameOver(newlyUnlocked);
}

function handleCupClick(e: Event): void {
  e.preventDefault();
  if (!isPlaying) return;

  clearCupTimeout();
  const now = performance.now();
  combo = nextCombo(combo, lastClickAt, now);
  lastClickAt = now;

  if (comboResetTimerId) clearTimeout(comboResetTimerId);
  comboResetTimerId = setTimeout(() => {
    combo = 0;
    updateCombo();
  }, COMBO_WINDOW_MS + 60);

  const points = totalPoints(isGolden, combo);
  spawnFloatText(points);
  if (combo >= COMBO_BURST_THRESHOLD) spawnComboBurst(combo);
  updateCombo();

  if (isGolden) {
    goldenCupsCaught += 1;
    audio.playGolden();
  } else {
    audio.playNormal();
  }

  score += points;
  updateScore();
  moveCupRandom();
  armCupTimeout(DIFFICULTIES[currentDifficulty].cupTimeoutMs);

  dom.cup.classList.remove('pop');
  void dom.cup.offsetWidth;
  dom.cup.classList.add('pop');
}

function buildShareText(): string {
  const url = `${window.location.origin}${SHARE_PATH}`;
  return `I scored ${score} in Coffee Rush ☕ Can you beat me? ${url}`;
}

function handleShare(): void {
  void copyToClipboard(buildShareText()).then(
    () => showCopiedToast('Copied to clipboard!'),
    () => showCopiedToast("Couldn't copy — try again"),
  );
}

function handleResize(): void {
  if (isPlaying) return;
  if (!dom.gameUI.hidden) placeCupCenter();
}

function toggleSound(): void {
  soundOn = !soundOn;
  dom.soundIcon.textContent = soundOn ? '🔊' : '🔇';
  dom.soundToggle.classList.toggle('muted', !soundOn);
  dom.soundToggle.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  saveSoundPref(soundOn);
  if (soundOn) {
    audio.playClick({ type: 'sine', freq: 880, freqEnd: 660, peak: 0.14, dur: 0.1 });
  }
}

function init(): void {
  dom.soundIcon.textContent = soundOn ? '🔊' : '🔇';
  dom.soundToggle.classList.toggle('muted', !soundOn);
  dom.soundToggle.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
  const nick = loadGuestNickname();
  if (nick) dom.lbNickname.value = nick;
  selectDifficulty('normal');
  showWelcome();
}

dom.startGameBtn.addEventListener('click', () => {
  audio.prime();
  startGame();
});
dom.playAgainBtn.addEventListener('click', () => {
  audio.prime();
  startGame();
});
dom.backToMenuBtn.addEventListener('click', showWelcome);
dom.shareFinalBtn.addEventListener('click', handleShare);
dom.soundToggle.addEventListener('click', toggleSound);
dom.resetProgressBtn?.addEventListener('click', resetProgress);
dom.lbSubmit.addEventListener('click', () => {
  void handleSubmit();
});

dom.difficultyBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-difficulty');
    if (key) selectDifficulty(key);
  });
});

dom.cup.addEventListener('click', handleCupClick);
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

init();
