import '@styles/shell.css';
import { GAMES, type GameId } from '@shared/config/games';
import {
  fetchTop100,
  formatGameValue,
  LEADERBOARD_UNAVAILABLE_MSG,
  leaderboardErrorMessage,
  type LeaderboardGameId,
} from '@shared/leaderboard/client';
import { isSupabaseConfigured } from '@shared/config/env';

const tabsEl = document.getElementById('lbTabs');
const tableBody = document.getElementById('lbBody');
const statusEl = document.getElementById('lbStatus');

let active: LeaderboardGameId = 'coffee-escape';

function setStatus(msg: string, isError = false): void {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.classList.toggle('is-error', isError);
  statusEl.style.color = isError ? '#c0392b' : '';
}

function renderTabs(): void {
  if (!tabsEl) return;
  tabsEl.replaceChildren();
  for (const g of GAMES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${g.id === active ? 'btn-primary' : 'btn-secondary'}`;
    btn.textContent = `${g.emoji} ${g.name}`;
    btn.addEventListener('click', () => {
      active = g.id;
      renderTabs();
      void load(active);
    });
    tabsEl.appendChild(btn);
  }
}

async function load(game: GameId): Promise<void> {
  if (!tableBody) return;
  tableBody.replaceChildren();

  if (!isSupabaseConfigured()) {
    setStatus(LEADERBOARD_UNAVAILABLE_MSG, true);
    return;
  }

  setStatus('Loading…');
  const { data, error } = await fetchTop100(game);
  if (error) {
    setStatus(leaderboardErrorMessage(error), true);
    return;
  }
  if (!data.length) {
    setStatus('No scores yet — be the first!');
    return;
  }
  setStatus(`${data.length} scores`);
  data.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(row.nickname || '—')}</td>
      <td>${escapeHtml(formatGameValue(game, row))}</td>
    `;
    tableBody.appendChild(tr);
  });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

renderTabs();
void load(active);
