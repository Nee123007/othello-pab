export function getChebyshevDistance(sq1: number, sq2: number): number {
  const r1 = Math.floor(sq1 / 8);
  const c1 = sq1 % 8;
  const r2 = Math.floor(sq2 / 8);
  const c2 = sq2 % 8;
  return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2));
}

export function getFlipDelayMs(placedSq: number, flippedSq: number): number {
  if (placedSq < 0 || placedSq >= 64 || flippedSq < 0 || flippedSq >= 64) {
    return 0;
  }
  return getChebyshevDistance(placedSq, flippedSq) * 60;
}

