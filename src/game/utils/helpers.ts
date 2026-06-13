export function pctToPixel(pct: number, dimension: number): number {
  return (pct / 100) * dimension
}

export function distanceBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
