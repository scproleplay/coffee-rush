import '@styles/shell.css';
import {
  getSession,
  initAuth,
  onSessionChange,
  saveNickname,
  signInWithMagicLink,
  signOut,
} from '@shared/auth/session';
import { isSupabaseConfigured } from '@shared/config/env';

const nickInput = document.getElementById('profileNick') as HTMLInputElement | null;
const statusEl = document.getElementById('profileStatus');
const form = document.getElementById('profileForm') as HTMLFormElement | null;
const modeEl = document.getElementById('profileMode');
const loginForm = document.getElementById('loginForm') as HTMLFormElement | null;
const loginEmail = document.getElementById('loginEmail') as HTMLInputElement | null;
const loginStatus = document.getElementById('loginStatus');
const guestLoginBlock = document.getElementById('guestLoginBlock');
const signedInBlock = document.getElementById('signedInBlock');
const signedInEmail = document.getElementById('signedInEmail');
const signOutBtn = document.getElementById('signOutBtn');

function setStatus(el: HTMLElement | null, msg: string, ok = true): void {
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#0d7a3f' : '#c0392b';
}

function paint(): void {
  const session = getSession();
  const nick = session.identity?.nickname || '';
  if (nickInput && document.activeElement !== nickInput) {
    nickInput.value = nick;
  }

  if (session.isAuthenticated && session.identity?.kind === 'user') {
    if (modeEl) modeEl.textContent = 'Signed in — nickname saved to your account';
    if (guestLoginBlock) guestLoginBlock.hidden = true;
    if (signedInBlock) signedInBlock.hidden = false;
    if (signedInEmail) {
      signedInEmail.textContent = session.identity.email
        ? `Signed in as ${session.identity.email}`
        : 'Signed in';
    }
  } else {
    if (modeEl) {
      modeEl.textContent = isSupabaseConfigured()
        ? 'Guest mode — play free anytime (login optional)'
        : 'Guest mode — login offline right now';
    }
    if (guestLoginBlock) guestLoginBlock.hidden = !isSupabaseConfigured();
    if (signedInBlock) signedInBlock.hidden = true;
  }
}

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  void (async () => {
    const res = await saveNickname(nickInput?.value || '');
    setStatus(statusEl, res.message, res.ok);
    paint();
  })();
});

loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  void (async () => {
    setStatus(loginStatus, 'Sending…', true);
    const res = await signInWithMagicLink(loginEmail?.value || '');
    setStatus(loginStatus, res.message, res.ok);
  })();
});

signOutBtn?.addEventListener('click', () => {
  void (async () => {
    await signOut();
    setStatus(loginStatus, 'Signed out. You’re a guest again.', true);
    paint();
  })();
});

onSessionChange(() => paint());

void initAuth().then(() => {
  paint();
  // Magic-link return often lands with hash/query; session is ready after initAuth
  if (getSession().isAuthenticated) {
    setStatus(statusEl, 'Welcome back!', true);
  }
});
