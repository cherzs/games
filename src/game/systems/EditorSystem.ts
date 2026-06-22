import * as Phaser from 'phaser'
import { GameMap, MapNode } from '@/game/types'
import { generateId } from '@/game/utils/helpers'
import { MapSystem } from './MapSystem'

export class EditorSystem {
  private scene: Phaser.Scene
  private mapSystem: MapSystem
  private selectedNodeId: string | null = null
  private isDragging: boolean = false
  private dragStartPos: { x: number; y: number } = { x: 0, y: 0 }
  private dragNodeStart: { x: number; y: number } = { x: 0, y: 0 }

  private onChange?: (map: GameMap) => void

  constructor(scene: Phaser.Scene, mapSystem: MapSystem) {
    this.scene = scene
    this.mapSystem = mapSystem
  }

  setOnChange(cb: (map: GameMap) => void): void {
    this.onChange = cb
  }

  addNode(worldX: number, worldY: number): void {
    const map = this.mapSystem.getMap()
    const xPct = +((worldX / map.width) * 100).toFixed(1)
    const yPct = +((worldY / map.height) * 100).toFixed(1)

    const node: MapNode = {
      id: `node_${generateId()}`,
      name: 'New Location',
      type: 'residential',
      purpose: 'visit',
      x: xPct,
      y: yPct,
      radius: 3,
    }

    map.nodes.push(node)
    this.mapSystem.updateMap(map)
    this.selectNode(node.id)
    this.onChange?.(map)
  }

  selectNode(nodeId: string): void {
    this.selectedNodeId = nodeId
    const node = this.mapSystem.getNodeById(nodeId)
    if (node) {
      this.mapSystem.drawEditorNode(node)
    }
  }

  deselectNode(): void {
    this.selectedNodeId = null
    this.mapSystem.clearEditorNode()
  }

  getSelectedNode(): MapNode | undefined {
    if (!this.selectedNodeId) return undefined
    return this.mapSystem.getNodeById(this.selectedNodeId)
  }

  editNode(nodeId: string, updates: Partial<MapNode>): void {
    const map = this.mapSystem.getMap()
    const idx = map.nodes.findIndex((n) => n.id === nodeId)
    if (idx === -1) return

    const nextUpdates = { ...updates }
    if (nextUpdates.x !== undefined) {
      nextUpdates.x = clampPct(Number(nextUpdates.x))
    }
    if (nextUpdates.y !== undefined) {
      nextUpdates.y = clampPct(Number(nextUpdates.y))
    }

    map.nodes[idx] = { ...map.nodes[idx], ...nextUpdates }
    this.mapSystem.updateMap(map)
    this.onChange?.(map)

    if (nodeId === this.selectedNodeId) {
      const node = this.mapSystem.getNodeById(nodeId)
      if (node) this.mapSystem.drawEditorNode(node)
    }
  }

  deleteNode(nodeId: string): void {
    const map = this.mapSystem.getMap()
    map.nodes = map.nodes.filter((n) => n.id !== nodeId)
    this.mapSystem.updateMap(map)
    if (this.selectedNodeId === nodeId) {
      this.selectedNodeId = null
      this.mapSystem.clearEditorNode()
    }
    this.onChange?.(map)
  }

  startDrag(worldX: number, worldY: number): void {
    const map = this.mapSystem.getMap()
    this.isDragging = true
    this.dragStartPos = { x: worldX, y: worldY }
    const node = this.getSelectedNode()
    if (node) {
      this.dragNodeStart = { x: node.x, y: node.y }
    }
  }

  updateDrag(worldX: number, worldY: number): void {
    if (!this.isDragging || !this.selectedNodeId) return

    const map = this.mapSystem.getMap()
    const dx = worldX - this.dragStartPos.x
    const dy = worldY - this.dragStartPos.y

    const newX = +(
      this.dragNodeStart.x +
      (dx / map.width) * 100
    ).toFixed(1)
    const newY = +(
      this.dragNodeStart.y +
      (dy / map.height) * 100
    ).toFixed(1)

    this.editNode(this.selectedNodeId, { x: newX, y: newY })
  }

  stopDrag(): void {
    this.isDragging = false
  }

  getIsDragging(): boolean {
    return this.isDragging
  }

  exportMap(): GameMap {
    return JSON.parse(JSON.stringify(this.mapSystem.getMap()))
  }

  importMap(map: GameMap): void {
    this.mapSystem.updateMap(map)
    this.selectedNodeId = null
    this.mapSystem.clearEditorNode()
    this.onChange?.(map)
  }

  findNodeAtPosition(worldX: number, worldY: number): MapNode | undefined {
    const nodes = this.mapSystem.getNodes()
    for (let i = nodes.length - 1; i >= 0; i--) {
      const pos = this.mapSystem.getNodeWorldPos(nodes[i])
      const radius = this.mapSystem.getNodeWorldRadius(nodes[i])
      const dx = worldX - pos.x
      const dy = worldY - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= radius) return nodes[i]
    }
    return undefined
  }

  destroy(): void {
    this.mapSystem.clearEditorNode()
    this.selectedNodeId = null
  }
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return +Math.max(0, Math.min(100, value)).toFixed(1)
}
