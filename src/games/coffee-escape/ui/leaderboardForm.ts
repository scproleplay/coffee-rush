import {
  leaderboardErrorMessage,
  validateNickname,
} from '@shared/leaderboard/client';
import { loadGuestNickname, saveGuestNickname } from '@shared/auth/session';
import type { CeDom } from './domRefs';

export interface LeaderboardFormApi {
  show: () => void;
  hide: () => void;
  submit: (score: number) => void;
  wasSubmitted: () => boolean;
  resetSubmitted: () => void;
}

export function createLeaderboardForm(
  dom: Pick<
    CeDom,
    'LB_FORM' | 'LB_NICK_EL' | 'LB_SUBMIT_BTN' | 'LB_STATUS_EL'
  >,
  submitScore: (payload: {
    game: 'coffee-escape';
    nickname: string;
    score: number;
  }) => Promise<{ ok: boolean; error?: { message?: string } | null }>,
): LeaderboardFormApi {
  let scoreSubmitted = false;
  const { LB_FORM, LB_NICK_EL, LB_STATUS_EL } = dom;
  const LB_SUBMIT_BTN = dom.LB_SUBMIT_BTN as HTMLButtonElement | null;

  function show(): void {
    if (!LB_FORM) return;
    LB_FORM.hidden = false;
    if (LB_STATUS_EL) {
      LB_STATUS_EL.textContent = '';
      LB_STATUS_EL.classList.remove('is-ok', 'is-error');
    }
    // Prefill profile / guest nickname (do not wipe on each game over)
    if (LB_NICK_EL) {
      const saved = loadGuestNickname();
      if (saved && !LB_NICK_EL.value.trim()) LB_NICK_EL.value = saved;
    }
  }

  function hide(): void {
    if (!LB_FORM) return;
    LB_FORM.hidden = true;
  }

  function submit(score: number): void {
    if (!LB_NICK_EL) return;
    const nickCheck = validateNickname(LB_NICK_EL.value);
    if (!nickCheck.ok) {
      if (LB_STATUS_EL) {
        LB_STATUS_EL.textContent = nickCheck.message;
        LB_STATUS_EL.classList.add('is-error');
        LB_STATUS_EL.classList.remove('is-ok');
      }
      return;
    }
    if (LB_SUBMIT_BTN) LB_SUBMIT_BTN.disabled = true;
    if (LB_STATUS_EL) {
      LB_STATUS_EL.textContent = 'Submitting…';
      LB_STATUS_EL.classList.remove('is-ok', 'is-error');
    }
    void submitScore({
      game: 'coffee-escape',
      nickname: nickCheck.nickname,
      score,
    }).then((res) => {
      if (LB_SUBMIT_BTN) LB_SUBMIT_BTN.disabled = false;
      if (res && res.ok) {
        scoreSubmitted = true;
        saveGuestNickname(nickCheck.nickname);
        if (LB_NICK_EL) LB_NICK_EL.value = nickCheck.nickname;
        if (LB_STATUS_EL) {
          LB_STATUS_EL.textContent = 'Submitted! View it on the leaderboard.';
          LB_STATUS_EL.classList.add('is-ok');
          LB_STATUS_EL.classList.remove('is-error');
        }
        if (LB_SUBMIT_BTN) LB_SUBMIT_BTN.disabled = true;
      } else if (LB_STATUS_EL) {
        LB_STATUS_EL.textContent =
          leaderboardErrorMessage(res?.error) || 'Submit failed. Please try again.';
        LB_STATUS_EL.classList.add('is-error');
        LB_STATUS_EL.classList.remove('is-ok');
      }
    });
  }

  return {
    show,
    hide,
    submit,
    wasSubmitted: () => scoreSubmitted,
    resetSubmitted: () => {
      scoreSubmitted = false;
    },
  };
}
