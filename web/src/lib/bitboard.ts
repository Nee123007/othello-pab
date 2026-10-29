import type { DiscColor } from './types';

export function bitboardsToDiscs(blackHex: string, whiteHex: string): (DiscColor | null)[] {
  const discs = Array<DiscColor | null>(64).fill(null);
  try {
    const b = BigInt(blackHex);
    const w = BigInt(whiteHex);

    for (let i = 0; i < 64; i++) {
      const mask = 1n << BigInt(i);
      if ((b & mask) !== 0n) {
        discs[i] = 'black';
      } else if ((w & mask) !== 0n) {
        discs[i] = 'white';
      }
    }
  } catch (err) {
    console.error('Failed to parse bitboard hex', err);
  }
  return discs;
}

export function squareToCoord(sq: number): string {
  if (sq < 0 || sq >= 64) return '--';
  const file = String.fromCharCode('a'.charCodeAt(0) + (sq % 8));
  const rank = Math.floor(sq / 8) + 1;
  return `${file}${rank}`;
}

