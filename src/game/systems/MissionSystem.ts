import { MapNode, Mission } from '@/game/types'
import { MapSystem } from './MapSystem'
import { distanceBetween } from '@/game/utils/helpers'

const MIN_MISSION_DIST_PX = 300
const DIST_RETRY_MAX = 5

export class MissionSystem {
  private mapSystem: MapSystem
  private currentMission: Mission | null = null
  private completedCount: number = 0
  private usedNodeIds: Set<string> = new Set()
  private lastDistricts: string[] = []

  private onMissionUpdate?: (mission: Mission | null) => void
  private onMissionComplete?: (mission: Mission) => void
  private onAllComplete?: () => void

  private missionQueue: string[] = []
  private queueIndex = 0
  private orderedMode = false

  constructor(mapSystem: MapSystem) {
    this.mapSystem = mapSystem
  }

  setOnMissionUpdate(cb: (mission: Mission | null) => void): void {
    this.onMissionUpdate = cb
  }

  setOnMissionComplete(cb: (mission: Mission) => void): void {
    this.onMissionComplete = cb
  }

  setOnAllComplete(cb: () => void): void {
    this.onAllComplete = cb
  }

  loadMissionOrder(nodeIds: string[]): void {
    const validIds = nodeIds.filter((id) => {
      const node = this.mapSystem.getNodeById(id)
      if (!node) return false
      if (node.purpose === 'spawn') return false
      if (node.type === 'road' || node.type === 'connector' || node.type === 'center') return false
      return true
    })
    this.missionQueue = [...validIds]
    this.queueIndex = 0
    this.orderedMode = true
    this.completedCount = 0
    this.usedNodeIds.clear()
  }

  generateMission(playerX?: number, playerY?: number): Mission | null {
    if (this.orderedMode) {
      return this.generateOrderedMission(playerX, playerY)
    }
    return this.generateRandomMission(playerX, playerY)
  }

  private generateOrderedMission(playerX?: number, playerY?: number): Mission | null {
    if (this.queueIndex >= this.missionQueue.length) {
      this.currentMission = null
      this.onMissionUpdate?.(null)
      this.onAllComplete?.()
      return null
    }

    const nodeId = this.missionQueue[this.queueIndex]
    this.queueIndex++

    const node = this.mapSystem.getNodeById(nodeId)
    if (!node) return null

    this.usedNodeIds.add(node.id)
    this.completedCount = this.queueIndex - 1

    const pos = this.mapSystem.getNodeWorldPos(node)
    const mission: Mission = {
      id: `m_${Date.now()}`,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      purpose: node.purpose,
      targetX: pos.x,
      targetY: pos.y,
      completed: false,
    }

    this.currentMission = mission
    this.onMissionUpdate?.(mission)
    return mission
  }

  private generateRandomMission(playerX?: number, playerY?: number): Mission | null {
    const allNodes = this.mapSystem.getNodes()
    if (allNodes.length === 0) return null

    const validNodes = allNodes.filter((n) => {
      if (n.purpose === 'spawn') return false
      if (n.type === 'road' || n.type === 'connector' || n.type === 'center') return false
      return true
    })
    if (validNodes.length === 0) return null

    const available = validNodes.filter((n) => !this.usedNodeIds.has(n.id))
    const pool = available.length > 0 ? available : validNodes

    if (available.length === 0) {
      this.usedNodeIds.clear()
    }

    let node = pool[Math.floor(Math.random() * pool.length)]

    if (playerX !== undefined && playerY !== undefined) {
      for (let retry = 0; retry < DIST_RETRY_MAX; retry++) {
        const pos = this.mapSystem.getNodeWorldPos(node)
        const dist = distanceBetween(playerX, playerY, pos.x, pos.y)
        if (dist >= MIN_MISSION_DIST_PX) break

        const farther = pool.filter((n) => {
          if (n.id === node.id) return false
          const np = this.mapSystem.getNodeWorldPos(n)
          return distanceBetween(playerX, playerY, np.x, np.y) >= MIN_MISSION_DIST_PX
        })
        if (farther.length === 0) break
        node = farther[Math.floor(Math.random() * farther.length)]
      }
    }

    for (let retry = 0; retry < 5; retry++) {
      const district = node.district ?? ''
      if (this.lastDistricts.length === 0) break
      if (this.lastDistricts[this.lastDistricts.length - 1] !== district) break

      const alternatives = pool.filter((n) => n.id !== node.id && (n.district ?? '') !== district)
      if (alternatives.length === 0) break
      node = alternatives[Math.floor(Math.random() * alternatives.length)]
    }

    const district = node.district ?? ''
    this.lastDistricts.push(district)
    if (this.lastDistricts.length > 1) this.lastDistricts.shift()

    this.usedNodeIds.add(node.id)

    const pos = this.mapSystem.getNodeWorldPos(node)
    const mission: Mission = {
      id: `m_${Date.now()}`,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      purpose: node.purpose,
      targetX: pos.x,
      targetY: pos.y,
      completed: false,
    }

    this.currentMission = mission
    this.onMissionUpdate?.(mission)
    return mission
  }

  getCurrentMission(): Mission | null {
    return this.currentMission
  }

  checkCompletion(playerX: number, playerY: number): boolean {
    if (!this.currentMission) return false

    const node = this.mapSystem.getNodeById(this.currentMission.nodeId)
    if (!node) return false

    const radius = this.mapSystem.getNodeWorldRadius(node)
    const pos = this.mapSystem.getNodeWorldPos(node)
    const dx = playerX - pos.x
    const dy = playerY - pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= radius) {
      this.currentMission.completed = true
      this.completedCount++
      this.onMissionComplete?.(this.currentMission)
      return true
    }
    return false
  }

  getCompletedCount(): number {
    return this.completedCount
  }

  getTotalCount(): number {
    return this.orderedMode ? this.missionQueue.length : 0
  }

  get isAllComplete(): boolean {
    return this.orderedMode && this.queueIndex >= this.missionQueue.length
  }

  setCompletedCount(count: number): void {
    this.completedCount = count
  }

  clearMission(): void {
    this.currentMission = null
    this.onMissionUpdate?.(null)
  }

  destroy(): void {
    this.currentMission = null
    this.usedNodeIds.clear()
    this.missionQueue = []
    this.queueIndex = 0
  }
}
