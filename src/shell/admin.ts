import '@styles/shell.css';
import { getAdminRole, getSession, initAuth, isAdmin, onSessionChange } from '@shared/auth/session';

const headerBadge = document.getElementById('adminHeaderBadge');
const subtitle = document.getElementById('adminSubtitle');
const gate = document.getElementById('adminGate');
const gateTitle = document.getElementById('adminGateTitle');
const gateBody = document.getElementById('adminGateBody');
const content = document.getElementById('adminContent');
const roleLine = document.getElementById('adminRoleLine');

function paint(): void {
  const session = getSession();
  const role = getAdminRole();
  const allowed = isAdmin();

  if (allowed && role) {
    if (headerBadge) {
      headerBadge.textContent = role === 'owner' ? '👑 Owner' : '🛡️ Admin';
    }
    if (subtitle) {
      subtitle.textContent =
        role === 'owner' ? 'Owner access · placeholder tools' : 'Admin access · placeholder tools';
    }
    if (gate) gate.hidden = true;
    if (content) content.hidden = false;
    if (roleLine) roleLine.textContent = `Role: ${role}`;
    return;
  }

  if (content) content.hidden = true;
  if (gate) gate.hidden = false;

  if (!session.isAuthenticated) {
    if (headerBadge) headerBadge.textContent = '🔒 Admin';
    if (subtitle) subtitle.textContent = 'Sign in required';
    if (gateTitle) gateTitle.textContent = 'Not signed in';
    if (gateBody) {
      gateBody.innerHTML =
        'Admin tools need a signed-in account with a matching <code>admin_users</code> row. ' +
        '<a href="/profile/">Go to Profile</a> to sign in.';
    }
    return;
  }

  if (headerBadge) headerBadge.textContent = '🔒 No access';
  if (subtitle) subtitle.textContent = 'This account is not an admin';
  if (gateTitle) gateTitle.textContent = 'Access denied';
  if (gateBody) {
    gateBody.textContent =
      'Your user id is not listed in admin_users. Guests and normal players never see admin controls.';
  }
}

onSessionChange(() => paint());

void initAuth().then(() => paint());
