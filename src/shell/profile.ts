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
const loginPanel = document.getElementById('loginPanel');
const loginPanelTitle = document.getElementById('loginPanelTitle');
const loginPanelBlurb = document.getElementById('loginPanelBlurb');
const adminRoleRow = document.getElementById('adminRoleRow');
const adminBadge = document.getElementById('adminBadge');
const adminRoleText = document.getElementById('adminRoleText');
const adminPanelLink = document.getElementById('adminPanelLink') as HTMLAnchorElement | null;

function setStatus(el: HTMLElement | null, msg: string, ok = true): void {
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#0d7a3f' : '#c0392b';
}

const ADMIN_HREF = '/admin/';

function paintAdminControls(): void {
  const session = getSession();
  const role =
    session.isAuthenticated && session.adminRole ? session.adminRole : null;

  if (!role) {
    if (adminRoleRow) adminRoleRow.hidden = true;
    if (adminPanelLink) adminPanelLink.hidden = true;
    return;
  }

  if (adminRoleRow) adminRoleRow.hidden = false;
  if (adminBadge) {
    adminBadge.textContent = role === 'owner' ? 'Owner' : 'Admin';
    adminBadge.dataset.role = role;
  }
  if (adminRoleText) adminRoleText.textContent = `Role: ${role}`;
  if (adminPanelLink) {
    // Always re-assert the real admin route (never nickname-based).
    adminPanelLink.href = ADMIN_HREF;
    adminPanelLink.setAttribute('href', ADMIN_HREF);
    adminPanelLink.hidden = false;
  }
}

function paint(): void {
  const session = getSession();
  const nick = session.identity?.nickname || '';
  if (nickInput && document.activeElement !== nickInput) {
    nickInput.value = nick;
  }

  if (session.isAuthenticated && session.identity?.kind === 'user') {
    if (modeEl) modeEl.textContent = 'Signed in — nickname saved to your account';
    if (loginPanelTitle) loginPanelTitle.textContent = 'Account';
    if (loginPanel) loginPanel.setAttribute('aria-label', 'Account');
    if (loginPanelBlurb) {
      loginPanelBlurb.textContent =
        'You’re signed in. Nickname saves to your account across devices.';
    }
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
    if (loginPanelTitle) loginPanelTitle.textContent = 'Optional login';
    if (loginPanel) loginPanel.setAttribute('aria-label', 'Optional login');
    if (loginPanelBlurb) {
      loginPanelBlurb.textContent =
        'Stay signed in across devices. You never need an account to play — login is optional.';
    }
    if (guestLoginBlock) guestLoginBlock.hidden = !isSupabaseConfigured();
    if (signedInBlock) signedInBlock.hidden = true;
  }

  paintAdminControls();
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

// Hard navigation to /admin/ so the multi-page shell always leaves Profile.
adminPanelLink?.addEventListener('click', (e) => {
  // Only force navigation for plain left-clicks (allow open-in-new-tab etc.).
  if (e.defaultPrevented) return;
  if (e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  window.location.assign(ADMIN_HREF);
});

onSessionChange(() => paint());

void initAuth().then(() => {
  paint();
  // Magic-link return often lands with hash/query; session is ready after initAuth
  if (getSession().isAuthenticated) {
    setStatus(statusEl, 'Welcome back!', true);
  }
});
