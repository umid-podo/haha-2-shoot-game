// 논리 단위는 1200×800 경기장 기준 (docs/02-game-design.md 초기 밸런스 설정)
export const ARENA_WIDTH = 1200;
export const ARENA_HEIGHT = 800;
export const RAIL_Y = { isb: 92, earth: 692 };
export const MIN_X = 80;
export const MAX_X = 1120;
export const MAX_SPEED = 300;
export const BODY_RADIUS = 30;
export const SPRITE_SIZE = 128;
export const BULLET_SPEED = 720;
export const BULLET_RADIUS = 5;
export const MUZZLE_OFFSET = 38;
export const FIRE_COOLDOWN = 0.35;
export const BULLET_LIFE = 2;
export const INVULNERABLE_TIME = 0.6;
export const DEADZONE = 0.15;
export const TARGET_SCORE = 10;
export const COUNTDOWN = 3;
export const KEY_AIM_SPEED = (120 * Math.PI) / 180;
export const TICK = 1 / 60;

export const TEAM_COLOR = { earth: '#247BDB', isb: '#D56A26' };
export const TEAM_NAME = { earth: '지구방위팀', isb: 'ISB팀' };
