import '@styles/shell.css';
import {
  getSession,
  initAuth,
  loadGuestNickname,
  saveGuestNickname,
} from '@shared/auth/session';

/**
 * Profile / identity shell.
 * Phase A: guest nickname (local).
 * Phase B: swap initAuth + form to Supabase Auth — same page, no game rewrites.
 */

const nickInput = document.getElementById('profileNick') as HTMLInputElement | null;
const statusEl = document.getElementById('profileStatus');
const form = document.getElementById('profileForm') as HTMLFormElement | null;
const modeEl = document.getElementById('profileMode');

function setStatus(msg: string, ok = true): void {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.color = ok ? '#0d7a3f' : '#c0392b';
}

async function boot(): Promise<void> {
  await initAuth();
  const session = getSession();
  if (modeEl) {
    modeEl.textContent = session.isAuthenticated
      ? 'Signed in'
      : 'Guest mode — full login coming soon';
  }
  if (nickInput) {
    nickInput.value = loadGuestNickname() || session.identity?.nickname || '';
  }
}

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nick = (nickInput?.value || '').trim();
  if (nick.length < 1 || nick.length > 12) {
    setStatus('Nickname must be 1–12 characters.', false);
    return;
  }
  saveGuestNickname(nick);
  setStatus(`Saved! You’re “${nick}” across the arcade.`);
});

void boot();
