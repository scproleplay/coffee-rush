/** Shared nickname rules (matches leaderboard RLS). */

const NICKNAME_RE = /^[A-Za-z0-9 _-]+$/;

export function validateNickname(
  raw: string,
): { ok: true; nickname: string } | { ok: false; message: string } {
  const nickname = (raw || '').trim();
  if (nickname.length < 1 || nickname.length > 12) {
    return { ok: false, message: 'Nickname must be 1–12 characters.' };
  }
  if (!NICKNAME_RE.test(nickname)) {
    return {
      ok: false,
      message: 'Nickname can only use letters, numbers, spaces, _ and -.',
    };
  }
  return { ok: true, nickname };
}
