import { RAIL_Y, COUNTDOWN } from './config.js';

// characterId는 assets/manifest.json의 ID와 일치한다. 표시 이름은 여기서만 매핑한다.
export const SLOTS = [
  { id: 'P1', team: 'earth', characterId: 'earth-arrow', name: '온이름', weapon: '돌격소총' },
  { id: 'P2', team: 'isb', characterId: 'isb-agent-1', name: '요원 1', weapon: '쌍권총' },
  { id: 'P3', team: 'earth', characterId: 'earth-pizza', name: '피자럭스', weapon: '기관총' },
  { id: 'P4', team: 'isb', characterId: 'isb-agent-2', name: '요원 2', weapon: 'RPG' },
];

export function initialAim(team) {
  return team === 'isb' ? Math.PI / 2 : -Math.PI / 2;
}

/** @param {2|4} playerCount */
export function createMatch(playerCount) {
  const players = SLOTS.slice(0, playerCount).map((slot, i) => {
    const x = playerCount === 2 ? 600 : i < 2 ? 360 : 840;
    return {
      ...slot,
      x, previousX: x, y: RAIL_Y[slot.team],
      aim: initialAim(slot.team),
      cooldown: 0, invulnerable: 0,
    };
  });
  return {
    phase: 'countdown', countdown: COUNTDOWN,
    players, projectiles: [], nextProjectileId: 1,
    scores: { earth: 0, isb: 0 }, tick: 0, winner: null,
  };
}

export function createInputs(players) {
  const inputs = {};
  for (const p of players) {
    inputs[p.id] = { moveAxis: 0, touchAxis: 0, aim: initialAim(p.team), aiming: false, fireReleased: false };
  }
  return inputs;
}

/** 일시정지·포커스 상실 시 호출. 조준 각도는 유지하고 진행 중인 입력만 버린다. */
export function cancelInputs(inputs) {
  for (const f of Object.values(inputs)) {
    f.moveAxis = 0; f.touchAxis = 0; f.aiming = false; f.fireReleased = false;
  }
}
