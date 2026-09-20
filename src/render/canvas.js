import {
  ARENA_WIDTH, ARENA_HEIGHT, RAIL_Y, MIN_X, MAX_X, BODY_RADIUS, SPRITE_SIZE, TEAM_COLOR, TEAM_NAME,
} from '../game/config.js';

const INK = '#30353E';
const MAX_DPR = 2;
const RECOIL_TIME = 0.08;
const SPARK_TIME = 0.15;
const PLUS_ONE_TIME = 0.6;
const SCORE_BOX = { isb: 176, earth: 530 }; // 원본 메모처럼 오른쪽, 레일·캐릭터와 겹치지 않는 Y

/** manifest와 필수 이미지를 불러온다. 실패하면 파일 경로를 담은 Error를 던진다. */
export async function loadAssets() {
  const manifestPath = 'assets/manifest.json';
  const res = await fetch(manifestPath).catch(() => null);
  if (!res || !res.ok) throw new Error(manifestPath);
  const manifest = await res.json();
  const assets = {};
  await Promise.all(manifest.assets.map(async (entry) => {
    const img = new Image();
    img.src = manifest.pathBase + entry.path;
    try { await img.decode(); } catch { throw new Error(img.src); }
    assets[entry.id] = { img, anchor: entry.bodyAnchor };
  }));
  return assets;
}

export function createRenderer(canvas, wrap, assets) {
  const ctx = canvas.getContext('2d');
  let effects = [];
  const recoil = {};

  function resize() {
    const scale = Math.min(wrap.clientWidth / ARENA_WIDTH, wrap.clientHeight / ARENA_HEIGHT);
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.style.width = `${ARENA_WIDTH * scale}px`;
    canvas.style.height = `${ARENA_HEIGHT * scale}px`;
    canvas.width = Math.max(1, Math.round(ARENA_WIDTH * scale * dpr));
    canvas.height = Math.max(1, Math.round(ARENA_HEIGHT * scale * dpr));
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  function drawPlayer(p, input, time, reducedMotion) {
    const { img, anchor } = assets[p.characterId];
    const color = TEAM_COLOR[p.team];
    const hit = p.invulnerable > 0;

    // 판정 위치를 알려주는 몸 중심 팀 링. 무적 중에는 굵은 점선 외곽선.
    ctx.lineWidth = hit ? 5 : 3;
    ctx.strokeStyle = color;
    ctx.globalAlpha = hit ? 1 : 0.45;
    ctx.setLineDash(hit ? [8, 6] : []);
    ctx.beginPath();
    ctx.arc(p.x, p.y, BODY_RADIUS + (hit ? 8 : 0), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const bounce = !reducedMotion && input.moveAxis !== 0 ? Math.sin(time * 20) * 2 : 0;
    const squash = !reducedMotion && recoil[p.id] > 0 ? 0.92 : 1;
    const facing = Math.cos(p.aim) < 0 ? -1 : 1; // 원본은 오른쪽을 본다. 반전 시 앵커도 함께 반전된다.
    ctx.save();
    ctx.translate(p.x, p.y + bounce);
    ctx.scale(facing * squash, squash);
    ctx.globalAlpha = hit ? 0.6 : 1;
    ctx.drawImage(img, -anchor[0] * SPRITE_SIZE, -anchor[1] * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE);
    ctx.restore();

    // 현재 조준 방향 눈금(항상) + 발사 준비 중에만 조준선
    const cos = Math.cos(p.aim), sin = Math.sin(p.aim);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x + cos * BODY_RADIUS, p.y + sin * BODY_RADIUS, 5, 0, Math.PI * 2);
    ctx.fill();
    if (input.aiming) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.moveTo(p.x + cos * 38, p.y + sin * 38);
      ctx.lineTo(p.x + cos * 190, p.y + sin * 190);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(p.x + cos * 200, p.y + sin * 200);
      ctx.rotate(p.aim);
      ctx.beginPath();
      ctx.moveTo(12, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = `${p.id} ${p.name}`;
    const w = ctx.measureText(label).width + 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(p.x - w / 2, p.y + 47, w, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, p.x, p.y + 60);
  }

  function drawScore(team, score) {
    const x = 990, y = SCORE_BOX[team], w = 190, h = 64;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = TEAM_COLOR[team];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.drawImage(assets[`${team}-badge`].img, x + 10, y + 10, 44, 44);
    ctx.fillStyle = INK;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(TEAM_NAME[team], x + 62, y + 20);
    ctx.textAlign = 'right';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(`${score}점`, x + w - 12, y + 40);
  }

  return {
    /** step()이 돌려준 이벤트로 짧은 수명의 효과를 만든다. */
    addEvents(events) {
      for (const e of events) {
        if (e.type === 'fire') recoil[e.playerId] = RECOIL_TIME;
        if (e.type === 'hit') effects.push({ x: e.x, y: e.y, team: e.team, age: 0 });
      }
    },
    reset() { effects = []; for (const id of Object.keys(recoil)) delete recoil[id]; },
    draw(match, inputs, dt, time, reducedMotion) {
      ctx.setTransform(canvas.width / ARENA_WIDTH, 0, 0, canvas.height / ARENA_HEIGHT, 0, 0);
      ctx.drawImage(assets.arena.img, 0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // 배경 레일은 장식이므로 정확한 판정 Y에 기준선을 덧그린다.
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      for (const team of ['isb', 'earth']) {
        ctx.strokeStyle = TEAM_COLOR[team];
        ctx.beginPath();
        ctx.moveTo(MIN_X, RAIL_Y[team]); ctx.lineTo(MAX_X, RAIL_Y[team]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      drawScore('isb', match.scores.isb);
      drawScore('earth', match.scores.earth);

      const paused = match.phase === 'paused';
      for (const p of match.players) {
        if (!paused && recoil[p.id] > 0) recoil[p.id] -= dt;
        drawPlayer(p, inputs[p.id], time, reducedMotion);
      }

      for (const b of match.projectiles) {
        const rocket = b.ownerId === 'P4';
        const { img } = assets[rocket ? 'rocket' : 'bullet'];
        const w = rocket ? 44 : 32, h = rocket ? 22 : 16;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }

      if (!paused) for (const fx of effects) fx.age += dt;
      effects = effects.filter((fx) => fx.age < PLUS_ONE_TIME);
      for (const fx of effects) {
        if (fx.age < SPARK_TIME) ctx.drawImage(assets['hit-spark'].img, fx.x - 36, fx.y - 36, 72, 72);
        const rise = reducedMotion ? 0 : fx.age * 60;
        ctx.font = 'bold 34px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = TEAM_COLOR[fx.team];
        ctx.strokeText('+1', fx.x + 50, fx.y - 30 - rise);
        ctx.fillText('+1', fx.x + 50, fx.y - 30 - rise);
      }

      if (match.phase === 'countdown') {
        ctx.font = 'bold 200px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = INK;
        const n = String(Math.ceil(match.countdown));
        ctx.strokeText(n, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
        ctx.fillText(n, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
      }
    },
  };
}
