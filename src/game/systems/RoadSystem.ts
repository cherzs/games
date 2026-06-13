import { MapNode } from '@/game/types'
import { pctToPixel } from '@/game/utils/helpers'

export interface Seg { x1: number; y1: number; x2: number; y2: number; hw: number }

export class RoadSystem {
  private segs: Seg[] = []
  private nodeCenters: Array<{ x: number; y: number; r: number }> = []

  constructor() {
    this.buildRoads()
  }

  // Call after map loads so nodes are also walkable approach zones
  loadNodes(nodes: MapNode[], mapW: number, mapH: number): void {
    const dim = Math.max(mapW, mapH)
    this.nodeCenters = nodes.map((n) => ({
      x: pctToPixel(n.x, mapW),
      y: pctToPixel(n.y, mapH),
      // approach radius = game radius + generous buffer so player can reach from road
      r: pctToPixel(n.radius, dim) + 160,
    }))
  }

  getSegments(): ReadonlyArray<Seg> {
    return this.segs
  }

  getNodeCenters(): ReadonlyArray<{ x: number; y: number; r: number }> {
    return this.nodeCenters
  }

  isWalkable(x: number, y: number): boolean {
    for (const s of this.segs) {
      if (ptInSeg(x, y, s)) return true
    }
    for (const c of this.nodeCenters) {
      if ((x - c.x) * (x - c.x) + (y - c.y) * (y - c.y) <= c.r * c.r) return true
    }
    return false
  }

  private addSeg(x1: number, y1: number, x2: number, y2: number, hw: number): void {
    this.segs.push({ x1, y1, x2, y2, hw })
  }

  private buildRoads(): void {
    const a = this.addSeg.bind(this)

    // ── Gray main roads ──────────────────────────────────────
    a(1200, 160,  1200, 1500, 70)   // main vertical
    a(488,  765,  1875, 765,  70)   // main horizontal
    a(773,  1005, 1558, 1005, 62)   // lower horizontal
    a(580,  765,  197,  1140, 65)   // diagonal 1
    a(488,  1052, 188,  1381, 60)   // diagonal 2
    a(1768, 340,  1768, 1022, 65)   // right vertical

    // ── Pink / purple shopping roads ─────────────────────────
    a(280,  315,  1600, 315,  55)   // pink horizontal
    a(820,  155,  820,  768,  55)   // pink left branch
    a(1540, 155,  1540, 768,  55)   // pink right branch

    // ── Curved salmon road (bottom-right, bezier approximated) ─
    const crv = cubicBezier(
      [1558, 1005], [1920, 1005], [1940, 1220], [1940, 1400], 24,
    )
    for (let i = 0; i < crv.length - 1; i++) {
      a(crv[i][0], crv[i][1], crv[i + 1][0], crv[i + 1][1], 60)
    }
    a(1940, 1400, 1810, 1510, 60)
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function ptInSeg(px: number, py: number, s: Seg): boolean {
  const dx = s.x2 - s.x1
  const dy = s.y2 - s.y1
  const lenSq = dx * dx + dy * dy
  let cx: number, cy: number
  if (lenSq === 0) {
    cx = s.x1; cy = s.y1
  } else {
    const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / lenSq))
    cx = s.x1 + t * dx
    cy = s.y1 + t * dy
  }
  const dist2 = (px - cx) * (px - cx) + (py - cy) * (py - cy)
  return dist2 <= s.hw * s.hw
}

function cubicBezier(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  steps: number,
): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    pts.push([
      mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
      mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return pts
}
