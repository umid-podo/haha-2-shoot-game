/**
 * 원점 중심·반지름 r인 원과 선분 (x0,y0)→(x1,y1)의 가장 이른 접촉 시각 t∈[0,1]. 없으면 null.
 * 움직이는 대상은 호출 측에서 탄환 좌표에서 대상 좌표를 빼 상대 운동 선분으로 넘긴다.
 */
export function segmentCircleTime(x0, y0, x1, y1, r) {
  const c = x0 * x0 + y0 * y0 - r * r;
  if (c <= 0) return 0;
  const dx = x1 - x0, dy = y1 - y0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (x0 * dx + y0 * dy);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
