import '@styles/shell.css';
import { getAdminRole, getSession, initAuth, isAdmin, onSessionChange } from '@shared/auth/session';
import {
  adminStatsErrorMessage,
  fetchAdminOverview,
  formatAdminTimestamp,
  type AdminOverview,
} from '@shared/admin/stats';

const headerBadge = document.getElementById('adminHeaderBadge');
const subtitle = document.getElementById('adminSubtitle');
const gate = document.getElementById('adminGate');
const gateTitle = document.getElementById('adminGateTitle');
const gateBody = document.getElementById('adminGateBody');
const gateLinks = document.getElementById('adminGateLinks');
const content = document.getElementById('adminContent');
const roleLine = document.getElementById('adminRoleLine');
const loadStatus = document.getElementById('adminLoadStatus');
const totalScoresEl = document.getElementById('adminTotalScores');
const uniqueNicksEl = document.getElementById('adminUniqueNicks');
const ceScoresEl = document.getElementById('adminCeScores');
const ceHighEl = document.getElementById('adminCeHigh');
const recentBody = document.getElementById('adminRecentBody');
const refreshBtn = document.getElementById('adminRefreshBtn') as HTMLButtonElement | null;

let loadSeq = 0;
let lastAllowed = false;
let redirectedLoggedOut = false;

function setLoadStatus(msg: string, isError = false): void {
  if (!loadStatus) return;
  loadStatus.textContent = msg;
  loadStatus.classList.toggle('is-error', isError);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function paintOverview(overview: AdminOverview): void {
  if (totalScoresEl) totalScoresEl.textContent = String(overview.totalScores);
  if (uniqueNicksEl) uniqueNicksEl.textContent = String(overview.uniqueNicknames);
  if (ceScoresEl) ceScoresEl.textContent = String(overview.coffeeEscapeScores);
  if (ceHighEl) {
    ceHighEl.textContent =
      overview.highestCoffeeEscapeScore == null
        ? '—'
        : String(overview.highestCoffeeEscapeScore);
  }

  if (recentBody) {
    recentBody.replaceChildren();
    if (!overview.recent.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5">No submissions yet.</td>`;
      recentBody.appendChild(tr);
      return;
    }
    for (const row of overview.recent) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(formatAdminTimestamp(row.createdAt))}</td>
        <td>${escapeHtml(row.emoji)} ${escapeHtml(row.gameName)}</td>
        <td>${escapeHtml(row.nickname)}</td>
        <td>${escapeHtml(row.valueLabel)}</td>
        <td>${row.hasUserId ? 'yes' : 'no'}</td>
      `;
      recentBody.appendChild(tr);
    }
  }
}

function clearOverview(): void {
  if (totalScoresEl) totalScoresEl.textContent = '—';
  if (uniqueNicksEl) uniqueNicksEl.textContent = '—';
  if (ceScoresEl) ceScoresEl.textContent = '—';
  if (ceHighEl) ceHighEl.textContent = '—';
  if (recentBody) {
    recentBody.innerHTML = `<tr><td colspan="5">—</td></tr>`;
  }
}

async function loadStats(): Promise<void> {
  if (!isAdmin()) return;
  const seq = ++loadSeq;
  setLoadStatus('Loading stats…');
  if (refreshBtn) refreshBtn.disabled = true;

  const { data, error } = await fetchAdminOverview();
  if (seq !== loadSeq) return;

  if (refreshBtn) refreshBtn.disabled = false;

  if (error || !data) {
    clearOverview();
    setLoadStatus(adminStatsErrorMessage(error), true);
    return;
  }

  paintOverview(data);
  setLoadStatus(
    `Updated · ${data.totalScores} scores · ${data.recent.length} recent shown`,
  );
}

/**
 * Gate:
 * - admin/owner (admin_users by auth uid) → dashboard
 * - logged out → redirect to Profile (login)
 * - signed in, not admin → Access denied (no nickname/email checks)
 */
function paintGate(): void {
  const session = getSession();
  const role = getAdminRole();
  const allowed = isAdmin();

  if (allowed && role) {
    redirectedLoggedOut = false;
    if (headerBadge) {
      headerBadge.textContent = role === 'owner' ? '👑 Owner' : '🛡️ Admin';
    }
    if (subtitle) {
      subtitle.textContent =
        role === 'owner'
          ? 'Owner access · read-only tools'
          : 'Admin access · read-only tools';
    }
    if (gate) gate.hidden = true;
    if (gateLinks) gateLinks.hidden = true;
    if (content) content.hidden = false;
    if (roleLine) roleLine.textContent = `Role: ${role} · from admin_users`;

    if (!lastAllowed) {
      lastAllowed = true;
      void loadStats();
    }
    return;
  }

  lastAllowed = false;
  if (content) content.hidden = true;
  if (gate) gate.hidden = false;
  clearOverview();

  // Logged out → send to Profile to sign in (magic link)
  if (!session.isAuthenticated) {
    if (headerBadge) headerBadge.textContent = '🔒 Admin';
    if (subtitle) subtitle.textContent = 'Sign in required';
    if (gateTitle) gateTitle.textContent = 'Not signed in';
    if (gateBody) {
      gateBody.textContent = 'Redirecting to Profile so you can sign in…';
    }
    if (gateLinks) gateLinks.hidden = false;
    if (!redirectedLoggedOut) {
      redirectedLoggedOut = true;
      window.location.replace('/profile/');
    }
    return;
  }

  // Signed in but not in admin_users
  redirectedLoggedOut = false;
  if (headerBadge) headerBadge.textContent = '🔒 No access';
  if (subtitle) subtitle.textContent = 'This account is not an admin';
  if (gateTitle) gateTitle.textContent = 'Access denied';
  if (gateBody) {
    gateBody.textContent =
      'Your user id is not listed in admin_users. Guests and normal players never see admin controls. Access is not based on nickname or email.';
  }
  if (gateLinks) gateLinks.hidden = false;
}

refreshBtn?.addEventListener('click', () => {
  void loadStats();
});

onSessionChange(() => paintGate());

void initAuth().then(() => paintGate());
