import { GameMap } from '@/game/types'
import { pctToPixel } from '@/game/utils/helpers'
import { Seg } from './RoadSystem'

export type NodeStatus = 'road_connected' | 'road_warning' | 'off_road_node' | 'no_road_nearby' | 'invalid'

export interface NodeDiagnostic {
  id: string
  name: string
  district: string
  xPct: number
  yPct: number
  worldX: number
  worldY: number
  radiusPct: number
  radiusPx: number
  nearestRoadDist: number
  radiusOverlapsRoad: boolean
  approachOverlapsRoad: boolean
  spawnConnected: boolean
  status: NodeStatus
}

interface Point { x: number; y: number }

const APPROACH_BUFFER = 160

class UnionFind {
  parent: number[]
  rank: number[]

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.rank = new Array(n).fill(0)
  }

  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]
      x = this.parent[x]
    }
    return x
  }

  union(a: number, b: number): void {
    let ra = this.find(a)
    let rb = this.find(b)
    if (ra === rb) return
    if (this.rank[ra] < this.rank[rb]) {
      ;[ra, rb] = [rb, ra]
    }
    this.parent[rb] = ra
    if (this.rank[ra] === this.rank[rb]) {
      this.rank[ra]++
    }
  }
}

export class ReachabilityChecker {
  private map: GameMap
  private segs: Seg[]

  constructor(map: GameMap, segs: ReadonlyArray<Seg>) {
    this.map = map
    this.segs = [...segs]
  }

  run(): NodeDiagnostic[] {
    const mapW = this.map.width
    const mapH = this.map.height
    const dim = Math.max(mapW, mapH)

    const spawnNode = this.map.nodes.find((n) => n.id === 'spawn') ?? this.map.nodes[0]
    if (!spawnNode) return []

    const components = this.buildRoadGraph()

    const spawnApproachR = pctToPixel(spawnNode.radius, dim) + APPROACH_BUFFER
    const spawnWx = pctToPixel(spawnNode.x, mapW)
    const spawnWy = pctToPixel(spawnNode.y, mapH)

    const spawnComponents = new Set<number>()
    for (let i = 0; i < this.segs.length; i++) {
      if (this.circleOverlapsSegment(spawnWx, spawnWy, spawnApproachR, this.segs[i])) {
        spawnComponents.add(components.find(i))
      }
    }

    if (spawnComponents.size === 0) {
      console.warn('[Reachability] Spawn node approach zone does NOT overlap any road segment.')
    }

    const results: NodeDiagnostic[] = []

    for (const node of this.map.nodes) {
      const wx = pctToPixel(node.x, mapW)
      const wy = pctToPixel(node.y, mapH)
      const wr = pctToPixel(node.radius, dim)
      const approachR = wr + APPROACH_BUFFER

      let nearestRoadDist = Infinity
      let radiusOverlapsRoad = false
      let approachOverlapsRoad = false
      const nodeComponents = new Set<number>()

      for (let i = 0; i < this.segs.length; i++) {
        const seg = this.segs[i]
        const dist = this.distToSegmentEdge(wx, wy, seg)
        if (dist < nearestRoadDist) {
          nearestRoadDist = dist
        }
        if (dist <= wr) {
          radiusOverlapsRoad = true
        }
        if (this.circleOverlapsSegment(wx, wy, approachR, seg)) {
          approachOverlapsRoad = true
          nodeComponents.add(components.find(i))
        }
      }

      const spawnConnected = [...nodeComponents].some((c) => spawnComponents.has(c))

      const outOfBounds = node.x < 0 || node.x > 100 || node.y < 0 || node.y > 100 || node.radius <= 0

      let status: NodeStatus
      if (outOfBounds) {
        status = 'invalid'
      } else if (!approachOverlapsRoad) {
        status = 'no_road_nearby'
      } else if (!spawnConnected) {
        status = 'off_road_node'
      } else if (!radiusOverlapsRoad) {
        status = 'road_warning'
      } else {
        status = 'road_connected'
      }

      results.push({
        id: node.id,
        name: node.name,
        district: node.district ?? '',
        xPct: node.x,
        yPct: node.y,
        worldX: Math.round(wx),
        worldY: Math.round(wy),
        radiusPct: node.radius,
        radiusPx: Math.round(wr),
        nearestRoadDist: Math.round(nearestRoadDist),
        radiusOverlapsRoad,
        approachOverlapsRoad,
        spawnConnected,
        status,
      })
    }

    this.printReport(results)
    return results
  }

  private printReport(results: NodeDiagnostic[]): void {
    const connected = results.filter((r) => r.status === 'road_connected')
    const warning = results.filter((r) => r.status === 'road_warning')
    const offRoad = results.filter((r) => r.status === 'off_road_node')
    const noRoad = results.filter((r) => r.status === 'no_road_nearby')
    const invalid = results.filter((r) => r.status === 'invalid')

    console.group('%c🗺️  NODE ROAD PROXIMITY REPORT', 'font-size:16px; font-weight:bold')
    console.table(results.map((r) => ({
      id: r.id,
      name: r.name,
      district: r.district,
      'wx/wy': `${r.worldX},${r.worldY}`,
      'r(px)': r.radiusPx,
      'road_dist': r.nearestRoadDist,
      status: r.status,
    })), ['id', 'name', 'district', 'wx/wy', 'r(px)', 'road_dist', 'status'])

    console.log(
      `%c✓ road_connected: %c${connected.length}`,
      'color:#0f0', 'font-weight:bold',
    )
    console.log(
      `%c⚠ road_warning: %c${warning.length}`,
      'color:#fa0', 'font-weight:bold',
    )
    console.log(
      `%c⚠ off_road_node: %c${offRoad.length}`,
      'color:#ff0', 'font-weight:bold',
    )
    console.log(
      `%c✗ no_road_nearby: %c${noRoad.length}`,
      'color:#f80', 'font-weight:bold',
    )
    console.log(
      `%c✗ invalid: %c${invalid.length}`,
      'color:#f00', 'font-weight:bold',
    )

    if (offRoad.length > 0) {
      console.log('%c--- OFF ROAD NODES (disconnected from spawn road network) ---', 'color:#ff0; font-weight:bold')
      offRoad.forEach((n) => {
        console.log(`  ${n.id}  ${n.name}  (${n.district})  dist to road: ${n.nearestRoadDist}px`)
      })
    }

    if (noRoad.length > 0) {
      console.log('%c--- NO ROAD NEARBY ---', 'color:#f80; font-weight:bold')
      noRoad.forEach((n) => {
        console.log(`  ${n.id}  ${n.name}  (${n.district})  dist to road: ${n.nearestRoadDist}px`)
      })
    }

    if (warning.length > 0) {
      console.log('%c--- ROAD WARNING (radius off road) ---', 'color:#fa0; font-weight:bold')
      warning.forEach((n) => {
        console.log(`  ${n.id}  ${n.name}  (${n.district})  dist to road: ${n.nearestRoadDist}px  radius: ${n.radiusPx}px`)
      })
    }

    if (invalid.length > 0) {
      console.log('%c--- INVALID (outside map bounds) ---', 'color:#f00; font-weight:bold')
      invalid.forEach((n) => {
        console.log(`  ${n.id}  ${n.name}  (${n.district})`)
      })
    }

    console.groupEnd()
  }

  private distToSegmentEdge(px: number, py: number, seg: Seg): number {
    const closest = this.closestPointOnSegment(px, py, seg)
    const dist = Math.sqrt((px - closest.x) ** 2 + (py - closest.y) ** 2)
    return Math.max(0, dist - seg.hw)
  }

  private circleOverlapsSegment(cx: number, cy: number, r: number, seg: Seg): boolean {
    return this.distToSegmentEdge(cx, cy, seg) <= r
  }

  private closestPointOnSegment(px: number, py: number, seg: Seg): Point {
    const dx = seg.x2 - seg.x1
    const dy = seg.y2 - seg.y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return { x: seg.x1, y: seg.y1 }
    const t = Math.max(0, Math.min(1, ((px - seg.x1) * dx + (py - seg.y1) * dy) / lenSq))
    return { x: seg.x1 + t * dx, y: seg.y1 + t * dy }
  }

  private buildRoadGraph(): UnionFind {
    const n = this.segs.length
    const uf = new UnionFind(n)

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this.segmentsConnected(this.segs[i], this.segs[j])) {
          uf.union(i, j)
        }
      }
    }

    return uf
  }

  private segmentsConnected(a: Seg, b: Seg): boolean {
    const ENDPOINT_THRESHOLD = 40

    const aEnds: Point[] = [{ x: a.x1, y: a.y1 }, { x: a.x2, y: a.y2 }]
    const bEnds: Point[] = [{ x: b.x1, y: b.y1 }, { x: b.x2, y: b.y2 }]

    for (const ae of aEnds) {
      for (const be of bEnds) {
        const d = Math.sqrt((ae.x - be.x) ** 2 + (ae.y - be.y) ** 2)
        if (d <= ENDPOINT_THRESHOLD) return true
      }
    }

    const minDist = this.segmentSegmentMinDist(a, b)
    return minDist <= a.hw + b.hw
  }

  private segmentSegmentMinDist(a: Seg, b: Seg): number {
    if (this.segmentsIntersect(a, b)) return 0

    let minDist = Infinity
    const pa = this.closestPointOnSegment(a.x1, a.y1, b)
    minDist = Math.min(minDist, Math.sqrt((a.x1 - pa.x) ** 2 + (a.y1 - pa.y) ** 2))
    const pb = this.closestPointOnSegment(a.x2, a.y2, b)
    minDist = Math.min(minDist, Math.sqrt((a.x2 - pb.x) ** 2 + (a.y2 - pb.y) ** 2))
    const pc = this.closestPointOnSegment(b.x1, b.y1, a)
    minDist = Math.min(minDist, Math.sqrt((b.x1 - pc.x) ** 2 + (b.y1 - pc.y) ** 2))
    const pd = this.closestPointOnSegment(b.x2, b.y2, a)
    minDist = Math.min(minDist, Math.sqrt((b.x2 - pd.x) ** 2 + (b.y2 - pd.y) ** 2))

    return minDist
  }

  private segmentsIntersect(a: Seg, b: Seg): boolean {
    const cross = (ox: number, oy: number, ax: number, ay: number, bx: number, by: number) =>
      (ax - ox) * (by - oy) - (ay - oy) * (bx - ox)

    const d1 = cross(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1)
    const d2 = cross(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2)
    const d3 = cross(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1)
    const d4 = cross(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2)

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      return true
    }

    return false
  }
}
