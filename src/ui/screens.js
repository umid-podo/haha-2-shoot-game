import { TEAM_NAME } from '../game/config.js';
import { KEY_LABELS } from '../input/keyboard.js';

const $ = (selector) => document.querySelector(selector);
const MIN_PANEL_WIDTH = 220;

/** 메뉴·준비·일시정지·결과 DOM 화면. 'pause'와 'result'는 경기 화면 위에 겹친다. */
export function createScreens(handlers) {
  const game = $('#game');
  const screens = { menu: $('#screen-menu'), ready: $('#screen-ready'), pause: $('#screen-pause'), result: $('#screen-result') };

  function show(name) {
    game.hidden = name === 'menu' || name === 'ready';
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
    // 버튼 대신 제목에 포커스: 눌린 채 넘어온 Enter(P2 발사키) 반복이 버튼을 누르지 않게 한다.
    screens[name]?.querySelector('[tabindex="-1"]').focus();
  }

  for (const btn of document.querySelectorAll('.count-btn')) {
    btn.addEventListener('click', () => handlers.onSelectCount(Number(btn.dataset.count)));
  }
  $('#retry-btn').addEventListener('click', handlers.onRetryLoad);
  $('#start-btn').addEventListener('click', handlers.onStart);
  $('#back-btn').addEventListener('click', handlers.onMenu);
  $('#pause-btn').addEventListener('click', handlers.onPause);
  $('#resume-btn').addEventListener('click', handlers.onResume);
  for (const btn of document.querySelectorAll('.restart-btn')) btn.addEventListener('click', handlers.onStart);
  for (const btn of document.querySelectorAll('.menu-btn')) btn.addEventListener('click', handlers.onMenu);
  for (const btn of document.querySelectorAll('.mute-toggle')) btn.addEventListener('click', handlers.onToggleMute);
  $('#motion-toggle').addEventListener('click', handlers.onToggleMotion);

  return {
    show,
    setLoading() {
      $('#load-status').hidden = false;
      $('#load-status').textContent = '에셋을 불러오는 중…';
      $('#retry-btn').hidden = true;
    },
    setLoadError(path) {
      $('#load-status').textContent = `불러오지 못했습니다: ${path}`;
      $('#retry-btn').hidden = false;
    },
    setLoaded() {
      $('#load-status').hidden = true;
      for (const btn of document.querySelectorAll('.count-btn')) btn.disabled = false;
    },
    showReady(slots) {
      $('#slot-list').replaceChildren(...slots.map((s) => {
        const li = document.createElement('li');
        li.className = `team-${s.team}`;
        const img = document.createElement('img');
        img.src = `assets/characters/${s.characterId}.png`;
        img.alt = '';
        const title = document.createElement('b');
        title.textContent = `${s.id} · ${s.name} (${TEAM_NAME[s.team]} · ${s.weapon})`;
        const keys = document.createElement('small');
        keys.textContent = `키보드: ${KEY_LABELS[s.id]}`;
        li.append(img, title, keys);
        return li;
      }));
      $('#narrow-warning').hidden = window.innerWidth / slots.length >= MIN_PANEL_WIDTH;
      show('ready');
    },
    showResult(match) {
      const { winner, scores } = match;
      $('#result-title').textContent = winner === 'draw' ? '무승부' : `${TEAM_NAME[winner]} 우승!`;
      $('#result-score').textContent = `${TEAM_NAME.earth} ${scores.earth} : ${scores.isb} ${TEAM_NAME.isb}`;
      show('result');
    },
    announce(text) { $('#live').textContent = text; },
    syncSettings(settings) {
      for (const btn of document.querySelectorAll('.mute-toggle')) btn.setAttribute('aria-pressed', settings.muted);
      $('#motion-toggle').setAttribute('aria-pressed', settings.reducedMotion);
    },
  };
}
