/**
 * DOM handles for Coffee Escape overlays / HUD (CE-local).
 * Keeps getElementById noise out of the game loop file.
 */

export interface CeDom {
  STAGE: HTMLElement;
  CANVAS: HTMLCanvasElement;
  HUD: HTMLElement | null;
  SCORE_EL: HTMLElement | null;
  BEST_HUD_EL: HTMLElement | null;
  BEST_START_EL: HTMLElement | null;
  FINAL_SCORE_EL: HTMLElement | null;
  FINAL_BEST_EL: HTMLElement | null;
  OVER_TITLE_EL: HTMLElement | null;
  OVER_BLURB_EL: HTMLElement | null;
  NEW_BEST_EL: HTMLElement | null;
  FINAL_SCORE_ITEM: HTMLElement | null;
  FINAL_BEST_ITEM: HTMLElement | null;
  RUN_STAMP: HTMLElement | null;
  LB_FORM: HTMLElement | null;
  LB_NICK_EL: HTMLInputElement | null;
  LB_SUBMIT_BTN: HTMLElement | null;
  LB_STATUS_EL: HTMLElement | null;
  START_OVERLAY: HTMLElement | null;
  GAME_OVER_OVERLAY: HTMLElement | null;
  START_BTN: HTMLElement | null;
  TRY_AGAIN_BTN: HTMLElement | null;
  RESET_BEST_BTN: HTMLElement | null;
  JUMP_BTN: HTMLElement | null;
  BOOST_BTN: HTMLElement | null;
  BOOST_FILL: HTMLElement | null;
  BOOST_HUD_FILL: HTMLElement | null;
  CHASE_FILL: HTMLElement | null;
  CHASE_HUD: HTMLElement | null;
  CHASE_LABEL: HTMLElement | null;
  MUTE_BTN: HTMLElement | null;
  HINT: HTMLElement | null;
}

function req(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Coffee Escape missing #${id}`);
  return el;
}

export function getCeDom(): CeDom {
  const STAGE = req('ceStage');
  const CANVAS = req('ceCanvas') as HTMLCanvasElement;
  return {
    STAGE,
    CANVAS,
    HUD: document.getElementById('ceHud'),
    SCORE_EL: document.getElementById('ceScore'),
    BEST_HUD_EL: document.getElementById('ceBestHud'),
    BEST_START_EL: document.getElementById('ceBestStart'),
    FINAL_SCORE_EL: document.getElementById('ceFinalScore'),
    FINAL_BEST_EL: document.getElementById('ceFinalBest'),
    OVER_TITLE_EL: document.getElementById('ceOverTitle'),
    OVER_BLURB_EL: document.getElementById('ceOverBlurb'),
    NEW_BEST_EL: document.getElementById('ceNewBest'),
    FINAL_SCORE_ITEM: document.getElementById('ceFinalScoreItem'),
    FINAL_BEST_ITEM: document.getElementById('ceFinalBestItem'),
    RUN_STAMP: document.getElementById('ceRunStamp'),
    LB_FORM: document.getElementById('ceLbSubmit'),
    LB_NICK_EL: document.getElementById('ceLbNick') as HTMLInputElement | null,
    LB_SUBMIT_BTN: document.getElementById('ceLbSubmitBtn'),
    LB_STATUS_EL: document.getElementById('ceLbStatus'),
    START_OVERLAY: document.getElementById('ceStartOverlay'),
    GAME_OVER_OVERLAY: document.getElementById('ceGameOverOverlay'),
    START_BTN: document.getElementById('ceStartBtn'),
    TRY_AGAIN_BTN: document.getElementById('ceTryAgainBtn'),
    RESET_BEST_BTN: document.getElementById('ceResetBest'),
    JUMP_BTN: document.getElementById('ceJumpBtn'),
    BOOST_BTN: document.getElementById('ceBoostBtn'),
    BOOST_FILL: document.getElementById('ceBoostFill'),
    BOOST_HUD_FILL: document.getElementById('ceBoostHudFill'),
    CHASE_FILL: document.getElementById('ceChaseFill'),
    CHASE_HUD: document.getElementById('ceChaseHud'),
    CHASE_LABEL: document.getElementById('ceChaseLabel'),
    MUTE_BTN: document.getElementById('ceMuteBtn'),
    HINT: document.getElementById('ceHint'),
  };
}
