import { Mission } from '@/game/types'
import { distanceBetween } from '@/game/utils/helpers'
import { NodeDiagnostic } from './ReachabilityChecker'

interface MissionEntry {
  missionNumber: number
  nodeId: string
  nodeName: string
  district: string
  startTime: number
  endTime: number
  durationMs: number
  startPlayerX: number
  startPlayerY: number
  endPlayerX: number
  endPlayerY: number
  straightLineDistPx: number
  warnings: string[]
}

interface RoadQualityWarnings {
  invalidNodes: string[]
  offRoadNodes: string[]
  noRoadNearbyNodes: string[]
  roadWarningNodes: string[]
}

interface PlaytestSummary {
  totalMissions: number
  avgCompletionTimeMs: number
  medianCompletionTimeMs: number
  fastestMission: { nodeId: string; nodeName: string; district: string; durationMs: number }
  slowestMission: { nodeId: string; nodeName: string; district: string; durationMs: number }
  mostRepeatedDistrict: { district: string; count: number }
  tooFastCount: number
  tooSlowCount: number
  missionBlockers: string[]
  roadQualityWarnings: RoadQualityWarnings
  districtFrequency: Record<string, number>
  entries: MissionEntry[]
}

const MISSION_COUNT = 50
const TOO_FAST_MS = 3000
const TOO_SLOW_MS = 60000

export class PlaytestTracker {
  private entries: MissionEntry[] = []
  private currentStart: { mission: Mission; startTime: number; startX: number; startY: number } | null = null
  private isRunning = false
  private roadQualityWarnings: NodeDiagnostic[]
  private districtMap: Map<string, string> = new Map()
  private missionNumber = 0

  constructor(diagnostics: NodeDiagnostic[]) {
    this.roadQualityWarnings = diagnostics
  }

  start(): void {
    this.entries = []
    this.currentStart = null
    this.isRunning = true
    this.missionNumber = 0
    console.log('%c[PLAYTEST] %cStarted — tracking 50 missions', 'color:#0ff; font-weight:bold', '')
  }

  stop(): void {
    this.isRunning = false
    console.log('%c[PLAYTEST] %cStopped at %d missions', 'color:#0ff', '', this.entries.length)
  }

  get running(): boolean {
    return this.isRunning
  }

  get count(): number {
    return this.entries.length
  }

  get isComplete(): boolean {
    return this.count >= MISSION_COUNT
  }

  setDistrictForNode(nodeId: string, district: string): void {
    this.districtMap.set(nodeId, district)
  }

  recordStart(mission: Mission, playerX: number, playerY: number): void {
    if (!this.isRunning || this.isComplete) return
    this.currentStart = {
      mission,
      startTime: Date.now(),
      startX: playerX,
      startY: playerY,
    }
  }

  recordEnd(mission: Mission, playerX: number, playerY: number): void {
    if (!this.isRunning || this.isComplete) return
    if (!this.currentStart || this.currentStart.mission.nodeId !== mission.nodeId) return

    const endTime = Date.now()
    const durationMs = endTime - this.currentStart.startTime

    const district = this.districtMap.get(mission.nodeId) ?? ''

    const straightLineDistPx = Math.round(
      distanceBetween(
        this.currentStart.startX,
        this.currentStart.startY,
        mission.targetX,
        mission.targetY,
      ),
    )

    const warnings: string[] = []
    if (durationMs < TOO_FAST_MS) {
      warnings.push(`too_fast (${(durationMs / 1000).toFixed(1)}s < ${TOO_FAST_MS / 1000}s)`)
    }
    if (durationMs > TOO_SLOW_MS) {
      warnings.push(`too_slow (${(durationMs / 1000).toFixed(1)}s > ${TOO_SLOW_MS / 1000}s)`)
    }

    const prev = this.entries.length > 0 ? this.entries[this.entries.length - 1] : null
    if (prev && prev.district === district) {
      warnings.push('repeat_district')
    }

    this.missionNumber++
    const entry: MissionEntry = {
      missionNumber: this.missionNumber,
      nodeId: mission.nodeId,
      nodeName: mission.nodeName,
      district,
      startTime: this.currentStart.startTime,
      endTime,
      durationMs,
      startPlayerX: Math.round(this.currentStart.startX),
      startPlayerY: Math.round(this.currentStart.startY),
      endPlayerX: Math.round(playerX),
      endPlayerY: Math.round(playerY),
      straightLineDistPx,
      warnings,
    }

    this.entries.push(entry)
    this.currentStart = null

    console.log(
      `%c[PLAYTEST] %c#${entry.missionNumber} %c${entry.nodeName}%c (${entry.district}) %c→ ${(durationMs / 1000).toFixed(1)}s %c${straightLineDistPx}px %c${warnings.length > 0 ? warnings.join(', ') : ''}`,
      'color:#0ff', '', 'color:#ff0', '', 'color:#0f0', '', warnings.length > 0 ? 'color:#f00' : '',
    )

    if (this.isComplete) {
      this.finalize()
    }
  }

  finalize(): PlaytestSummary {
    this.isRunning = false
    const sorted = [...this.entries].sort((a, b) => a.durationMs - b.durationMs)
    const times = sorted.map((e) => e.durationMs)

    const total = times.reduce((s, t) => s + t, 0)
    const avg = this.entries.length > 0 ? Math.round(total / this.entries.length) : 0
    const median = times.length > 0 ? times[Math.floor(times.length / 2)] : 0

    const fastest = sorted[0]
    const slowest = sorted[sorted.length - 1]

    const districtFreq: Record<string, number> = {}
    for (const e of this.entries) {
      districtFreq[e.district] = (districtFreq[e.district] ?? 0) + 1
    }

    let mostDistrict = ''
    let mostCount = 0
    for (const [d, c] of Object.entries(districtFreq)) {
      if (c > mostCount) {
        mostCount = c
        mostDistrict = d
      }
    }

    const tooFastCount = this.entries.filter((e) => e.durationMs < TOO_FAST_MS).length
    const tooSlowCount = this.entries.filter((e) => e.durationMs > TOO_SLOW_MS).length

    const invalidNodes = this.roadQualityWarnings
      .filter((n) => n.status === 'invalid')
      .map((n) => `${n.id} (${n.name})`)

    const offRoadNodes = this.roadQualityWarnings
      .filter((n) => n.status === 'off_road_node')
      .map((n) => `${n.id} (${n.name})`)

    const noRoadNearbyNodes = this.roadQualityWarnings
      .filter((n) => n.status === 'no_road_nearby')
      .map((n) => `${n.id} (${n.name})`)

    const roadWarningNodes = this.roadQualityWarnings
      .filter((n) => n.status === 'road_warning')
      .map((n) => `${n.id} (${n.name} — radius off road)`)

    const summary: PlaytestSummary = {
      totalMissions: this.entries.length,
      avgCompletionTimeMs: avg,
      medianCompletionTimeMs: median,
      fastestMission: fastest
        ? { nodeId: fastest.nodeId, nodeName: fastest.nodeName, district: fastest.district, durationMs: fastest.durationMs }
        : { nodeId: '', nodeName: '', district: '', durationMs: 0 },
      slowestMission: slowest
        ? { nodeId: slowest.nodeId, nodeName: slowest.nodeName, district: slowest.district, durationMs: slowest.durationMs }
        : { nodeId: '', nodeName: '', district: '', durationMs: 0 },
      mostRepeatedDistrict: { district: mostDistrict, count: mostCount },
      tooFastCount,
      tooSlowCount,
      missionBlockers: invalidNodes,
      roadQualityWarnings: {
        invalidNodes,
        offRoadNodes,
        noRoadNearbyNodes,
        roadWarningNodes,
      },
      districtFrequency: districtFreq,
      entries: this.entries,
    }

    this.printSummary(summary)
    this.downloadJSON(summary)

    return summary
  }

  private printSummary(s: PlaytestSummary): void {
    const avgSec = (s.avgCompletionTimeMs / 1000).toFixed(1)
    const medSec = (s.medianCompletionTimeMs / 1000).toFixed(1)
    const fastSec = (s.fastestMission.durationMs / 1000).toFixed(1)
    const slowSec = (s.slowestMission.durationMs / 1000).toFixed(1)

    console.group('%c📊 PLAYTEST SUMMARY (50 missions)', 'font-size:16px; font-weight:bold')
    console.log(`%cTotal: %c${s.totalMissions}`, '', 'font-weight:bold')
    console.log(`%cAvg time: %c${avgSec}s %c| Median: %c${medSec}s`, '', 'color:#0f0', '', 'color:#0f0')
    console.log(`%cFastest: %c${s.fastestMission.nodeName} %c(${s.fastestMission.district}) %c${fastSec}s`, '', 'color:#ff0', '', 'color:#0f0')
    console.log(`%cSlowest: %c${s.slowestMission.nodeName} %c(${s.slowestMission.district}) %c${slowSec}s`, '', 'color:#f80', '', 'color:#f44')
    console.log(`%cMost repeated: %c${s.mostRepeatedDistrict.district} %c(x${s.mostRepeatedDistrict.count})`, '', 'color:#f0f', '')
    console.log(`%cToo fast (<3s): %c${s.tooFastCount} %c| Too slow (>60s): %c${s.tooSlowCount}`, '', 'color:#fa0', '', 'color:#f00')

    const { invalidNodes, offRoadNodes, noRoadNearbyNodes, roadWarningNodes } = s.roadQualityWarnings

    console.log('%c── Road Quality Warnings ──', 'font-weight:bold')

    if (invalidNodes.length > 0) {
      console.log(`%c✗ Mission blockers (invalid/out-of-bounds): %c${invalidNodes.length}`, 'color:#f00', 'font-weight:bold')
      invalidNodes.forEach((n) => console.log(`  ${n}`))
    } else {
      console.log('%c✗ Mission blockers (invalid/out-of-bounds): %c0', 'color:#0f0', '')
    }

    if (offRoadNodes.length > 0) {
      console.log(`%c⚠ Off-road nodes (disconnected from spawn road network): %c${offRoadNodes.length}`, 'color:#ff0', '')
      offRoadNodes.forEach((n) => console.log(`  ${n}`))
    } else {
      console.log('%c⚠ Off-road nodes: %c0', '', '')
    }

    if (noRoadNearbyNodes.length > 0) {
      console.log(`%c⚠ No road nearby: %c${noRoadNearbyNodes.length}`, 'color:#ff0', '')
      noRoadNearbyNodes.forEach((n) => console.log(`  ${n}`))
    } else {
      console.log('%c⚠ No road nearby: %c0', '', '')
    }

    if (roadWarningNodes.length > 0) {
      console.log(`%c⚠ Radius off-road (center near road but radius misses): %c${roadWarningNodes.length}`, 'color:#fa0', '')
      roadWarningNodes.forEach((n) => console.log(`  ${n}`))
    } else {
      console.log('%c⚠ Radius off-road: %c0', '', '')
    }

    console.log('%cDistrict frequency:', '')
    for (const [d, c] of Object.entries(s.districtFrequency)) {
      console.log(`  ${d}: ${c}`)
    }

    console.groupEnd()
  }

  private downloadJSON(summary: PlaytestSummary): void {
    const payload = JSON.stringify(summary, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `playtest_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    console.log('%c[PLAYTEST] %cJSON exported — check your Downloads folder', 'color:#0ff', '')
  }
}
