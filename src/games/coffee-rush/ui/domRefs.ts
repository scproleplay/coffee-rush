export interface CoffeeRushDom {
  welcomeScreen: HTMLElement;
  gameUI: HTMLElement;
  gameOverScreen: HTMLElement;
  startGameBtn: HTMLButtonElement;
  playAgainBtn: HTMLButtonElement;
  backToMenuBtn: HTMLButtonElement;
  shareFinalBtn: HTMLButtonElement;
  difficultyBtns: NodeListOf<HTMLButtonElement>;
  welcomeBestEl: HTMLElement;
  scoreEl: HTMLElement;
  timeEl: HTMLElement;
  comboEl: HTMLElement;
  difficultyBadge: HTMLElement;
  countdownEl: HTMLElement;
  countdownText: HTMLElement;
  cup: HTMLButtonElement;
  playArea: HTMLElement;
  messageEl: HTMLElement;
  sparklesEl: HTMLElement | null;
  finalScoreEl: HTMLElement;
  finalBestEl: HTMLElement;
  rankEmojiEl: HTMLElement;
  rankNameEl: HTMLElement;
  achievementToastEl: HTMLElement;
  achievementsListEl: HTMLElement;
  achievementsCountEl: HTMLElement;
  copiedToast: HTMLElement;
  soundToggle: HTMLButtonElement;
  soundIcon: HTMLElement;
  resetProgressBtn: HTMLButtonElement | null;
  lbList: HTMLElement;
  lbNickname: HTMLInputElement;
  lbSubmit: HTMLButtonElement;
  lbStatus: HTMLElement;
}

function must<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as unknown as T;
}

export function getRushDom(): CoffeeRushDom {
  const countdownEl = must<HTMLElement>('countdown');
  const text = countdownEl.querySelector('.countdown-text');
  if (!text) throw new Error('Missing .countdown-text');
  const cup = must<HTMLButtonElement>('cup');

  return {
    welcomeScreen: must('welcomeScreen'),
    gameUI: must('gameUI'),
    gameOverScreen: must('gameOverScreen'),
    startGameBtn: must('startGameBtn'),
    playAgainBtn: must('playAgainBtn'),
    backToMenuBtn: must('backToMenuBtn'),
    shareFinalBtn: must('shareFinalBtn'),
    difficultyBtns: document.querySelectorAll('.difficulty-btn'),
    welcomeBestEl: must('welcomeBest'),
    scoreEl: must('score'),
    timeEl: must('time'),
    comboEl: must('combo'),
    difficultyBadge: must('difficultyBadge'),
    countdownEl,
    countdownText: text as HTMLElement,
    cup,
    playArea: must('playArea'),
    messageEl: must('message'),
    sparklesEl: cup.querySelector('.sparkles'),
    finalScoreEl: must('finalScore'),
    finalBestEl: must('finalBest'),
    rankEmojiEl: must('rankEmoji'),
    rankNameEl: must('rankName'),
    achievementToastEl: must('achievementToast'),
    achievementsListEl: must('achievementsList'),
    achievementsCountEl: must('achievementsCount'),
    copiedToast: must('copiedToast'),
    soundToggle: must('soundToggle'),
    soundIcon: must('soundIcon'),
    resetProgressBtn: document.getElementById('resetProgressBtn') as HTMLButtonElement | null,
    lbList: must('lbListCoffeeRush'),
    lbNickname: must('lbNicknameCoffeeRush'),
    lbSubmit: must('lbSubmitCoffeeRush'),
    lbStatus: must('lbStatusCoffeeRush'),
  };
}
