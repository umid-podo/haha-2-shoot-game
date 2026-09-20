import {
  ARENA_WIDTH, ARENA_HEIGHT, MIN_X, MAX_X, MAX_SPEED, BODY_RADIUS, BULLET_SPEED, BULLET_RADIUS,
  MUZZLE_OFFSET, FIRE_COOLDOWN, BULLET_LIFE, INVULNERABLE_TIME, TARGET_SCORE, TICK,
} from './config.js';
import { segmentCircleTime } from './collision.js';

const HIT_RADIUS = BODY_RADIUS + BULLET_RADIUS;
const OUT_MARGIN = 40;

export function spawnProjectile(match, player, aim) {
  const x = player.x + Math.cos(aim) * MUZZLE_OFFSET;
  const y = player.y + Math.sin(aim) * MUZZLE_OFFSET;
  const projectile = {
    id: match.nextProjectileId++, ownerId: player.id, team: player.team,
    x, y, previousX: x, previousY: y,
    vx: Math.cos(aim) * BULLET_SPEED, vy: Math.sin(aim) * BULLET_SPEED,
    life: BULLET_LIFE,
  };
  match.projectiles.push(projectile);
  return projectile;
}

/**
 * 고정 틱 한 번. 렌더·사운드용 이벤트 목록을 돌려준다.
 * 순서는 docs/04-technical-design.md "고정 업데이트"를 따른다.
 */
export function step(match, inputs, dt = TICK) {
  const events = [];
  if (match.phase === 'countdown') {
    for (const f of Object.values(inputs)) f.fireReleased = false;
    match.countdown -= dt;
    if (match.countdown <= 0) match.phase = 'playing';
    return events;
  }
  if (match.phase !== 'playing') return events;
  match.tick++;

  const wasInvulnerable = new Set();
  for (const p of match.players) {
    const input = inputs[p.id];
    if (p.invulnerable > 0) wasInvulnerable.add(p.id);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.previousX = p.x;
    p.x = Math.min(MAX_X, Math.max(MIN_X, p.x + input.moveAxis * MAX_SPEED * dt));
    p.aim = input.aim;
    if (input.fireReleased) {
      input.fireReleased = false; // cooldown 중 놓은 입력은 버린다 (예약 발사 없음)
      if (p.cooldown <= 0) {
        spawnProjectile(match, p, p.aim);
        p.cooldown = FIRE_COOLDOWN;
        events.push({ type: 'fire', playerId: p.id });
      }
    }
  }

  const contacts = [];
  for (const b of match.projectiles) {
    b.previousX = b.x; b.previousY = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.life -= dt;
    let earliest = null;
    for (const p of match.players) {
      if (p.team === b.team) continue;
      const t = segmentCircleTime(
        b.previousX - p.previousX, b.previousY - p.y, b.x - p.x, b.y - p.y, HIT_RADIUS);
      if (t !== null && (earliest === null || t < earliest.t)) earliest = { t, projectile: b, victim: p };
    }
    if (earliest) contacts.push(earliest);
  }
  contacts.sort((a, b) => a.t - b.t || a.projectile.id - b.projectile.id || a.victim.id.localeCompare(b.victim.id));

  const removed = new Set();
  const hitThisTick = new Set();
  for (const { projectile, victim } of contacts) {
    removed.add(projectile);
    if (wasInvulnerable.has(victim.id) || hitThisTick.has(victim.id)) continue;
    hitThisTick.add(victim.id);
    victim.invulnerable = INVULNERABLE_TIME;
    match.scores[projectile.team]++;
    events.push({ type: 'hit', x: victim.x, y: victim.y, team: projectile.team });
  }

  match.projectiles = match.projectiles.filter((b) =>
    !removed.has(b) && b.life > 0 &&
    b.x > -OUT_MARGIN && b.x < ARENA_WIDTH + OUT_MARGIN && b.y > -OUT_MARGIN && b.y < ARENA_HEIGHT + OUT_MARGIN);

  // 같은 틱의 적중을 모두 반영한 뒤 판정한다. 동시 10점은 무승부.
  const { scores } = match;
  scores.earth = Math.min(TARGET_SCORE, scores.earth);
  scores.isb = Math.min(TARGET_SCORE, scores.isb);
  const earthWon = scores.earth >= TARGET_SCORE, isbWon = scores.isb >= TARGET_SCORE;
  if (earthWon || isbWon) {
    match.winner = earthWon && isbWon ? 'draw' : earthWon ? 'earth' : 'isb';
    match.phase = 'result';
    match.projectiles = [];
    for (const f of Object.values(inputs)) f.fireReleased = false;
    events.push({ type: 'result', winner: match.winner });
  }
  return events;
}
