const KNOWN = new Set([4, 6, 8, 10, 12, 20, 100]);
export function knownDie(sides: number) {
  return KNOWN.has(sides);
}
