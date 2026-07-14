import '@styles/shell.css';
import { GAMES } from '@shared/config/games';
import { initAuth, getSession, onSessionChange } from '@shared/auth/session';

function renderGameCards(root: HTMLElement): void {
  const list = document.createElement('ul');
  list.className = 'game-grid';
  list.setAttribute('role', 'list');

  for (const game of GAMES) {
    const li = document.createElement('li');
    li.className = `game-card${game.featured ? ' game-card--featured' : ''}`;
    li.style.setProperty('--card-accent', game.accent);

    const emoji = document.createElement('div');
    emoji.className = 'game-card-emoji';
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = game.emoji;

    const name = document.createElement('h2');
    name.className = 'game-card-name';
    name.textContent = game.name;

    const desc = document.createElement('p');
    desc.className = 'game-card-desc';
    desc.textContent = game.tagline;

    const meta = document.createElement('div');
    meta.className = 'game-card-meta';
    if (game.featured) {
      const feat = document.createElement('span');
      feat.className = 'pill pill-featured';
      feat.textContent = '⭐ Featured';
      meta.appendChild(feat);
    }
    const engine = document.createElement('span');
    engine.className = 'pill';
    engine.textContent = game.engine;
    meta.appendChild(engine);

    const status = document.createElement('span');
    status.className = game.platformReady ? 'pill pill-live' : 'pill pill-legacy';
    status.textContent = game.platformReady ? 'Platform' : 'Legacy';
    meta.appendChild(status);

    const play = document.createElement('a');
    play.className = 'btn btn-primary';
    play.href = game.href;
    play.setAttribute('aria-label', `Play ${game.name}`);
    play.textContent = `Play ${game.name}`;

    li.append(emoji, name, desc, meta, play);
    list.appendChild(li);
  }

  root.replaceChildren(list);
}

function paintGreet(): void {
  const greet = document.getElementById('shellGreet');
  if (!greet) return;
  const session = getSession();
  const nick = session.identity?.nickname;
  if (session.isAuthenticated && nick) {
    greet.textContent = `Welcome back, ${nick}! (signed in) Ready for another run?`;
  } else if (nick) {
    greet.textContent = `Welcome back, ${nick}! Ready for another run?`;
  } else {
    greet.textContent = 'Jump in. Chase high scores. Become a caffeine legend.';
  }
}

async function boot(): Promise<void> {
  await initAuth();
  paintGreet();
  onSessionChange(() => paintGreet());

  const grid = document.getElementById('gameGrid');
  if (grid) renderGameCards(grid);
}

boot().catch((err) => {
  console.error('Shell boot failed', err);
});
