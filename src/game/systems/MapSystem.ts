import * as Phaser from 'phaser'
import { GameMap, MapNode } from '@/game/types'
import { pctToPixel } from '@/game/utils/helpers'

export class MapSystem {
  private scene: Phaser.Scene
  private map!: GameMap
  private background!: Phaser.GameObjects.Image
  private nodeGraphics: Phaser.GameObjects.Graphics[] = []
  private nodeLabels: Phaser.GameObjects.Text[] = []
  private editorNodeGraphics: Phaser.GameObjects.Graphics | null = null
  private showNodes = true

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  loadMap(map: GameMap, showNodes = true): void {
    this.map = map
    this.showNodes = showNodes
    this.renderBackground()
    this.renderNodes()
  }

  getMap(): GameMap {
    return this.map
  }

  updateMap(map: GameMap, showNodes = true): void {
    this.clearNodes()
    this.map = map
    this.showNodes = showNodes
    this.renderNodes()
  }

  getNodeWorldPos(node: MapNode): { x: number; y: number } {
    if (!this.map) return { x: 0, y: 0 }
    return {
      x: pctToPixel(node.x, this.map.width),
      y: pctToPixel(node.y, this.map.height),
    }
  }

  getNodeWorldRadius(node: MapNode): number {
    if (!this.map) return 0
    return pctToPixel(node.radius, Math.max(this.map.width, this.map.height))
  }

  getNodes(): MapNode[] {
    if (!this.map) return []
    return this.map.nodes
  }

  getNodeById(id: string): MapNode | undefined {
    if (!this.map) return undefined
    return this.map.nodes.find((n) => n.id === id)
  }

  getMapBounds(): { width: number; height: number } {
    if (!this.map) return { width: 0, height: 0 }
    return { width: this.map.width, height: this.map.height }
  }

  private renderBackground(): void {
    if (!this.map) return
    if (this.background) this.background.destroy()
    this.background = this.scene.add.image(0, 0, 'map_bg')
    this.background.setOrigin(0, 0)
    this.background.setDisplaySize(this.map.width, this.map.height)
    this.background.setDepth(0)
  }

  private renderNodes(): void {
    this.clearNodes()
    if (!this.showNodes || !this.map) return

    this.map.nodes.forEach((node) => {
      const pos = this.getNodeWorldPos(node)
      const radius = this.getNodeWorldRadius(node)

      const gfx = this.scene.add.graphics()
      gfx.setDepth(2)

      const dot = 28
      gfx.lineStyle(2, 0x22cc44, 0.7)
      gfx.fillStyle(0x44ff66, 0.25)
      gfx.strokeCircle(pos.x, pos.y, dot)
      gfx.fillCircle(pos.x, pos.y, dot)
      this.nodeGraphics.push(gfx)

      const lbl = this.scene.add.text(pos.x, pos.y - dot - 14, node.name, {
        fontSize: '22px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
        resolution: 2,
        padding: { x: 4, y: 2 },
        backgroundColor: 'rgba(0,0,0,0.45)',
      })
      lbl.setOrigin(0.5)
      lbl.setDepth(3)
      this.nodeLabels.push(lbl)
    })
  }

  drawEditorNode(node: MapNode, color: number = 0xffff00): void {
    this.clearEditorNode()
    const pos = this.getNodeWorldPos(node)
    const radius = this.getNodeWorldRadius(node)

    const gfx = this.scene.add.graphics()
    gfx.setDepth(10)
    gfx.lineStyle(3, color, 0.9)
    gfx.fillStyle(color, 0.1)
    gfx.strokeCircle(pos.x, pos.y, radius)
    gfx.fillCircle(pos.x, pos.y, radius)

    const dragHandle = this.scene.add.graphics()
    dragHandle.setDepth(11)
    dragHandle.fillStyle(0xffff00, 0.8)
    dragHandle.fillCircle(pos.x, pos.y, 8)

    this.editorNodeGraphics = gfx
  }

  clearEditorNode(): void {
    if (this.editorNodeGraphics) {
      this.editorNodeGraphics.destroy()
      this.editorNodeGraphics = null
    }
  }

  private clearNodes(): void {
    this.nodeGraphics.forEach((g) => g.destroy())
    this.nodeLabels.forEach((l) => l.destroy())
    this.nodeGraphics = []
    this.nodeLabels = []
  }

  highlightNode(nodeId: string, color: number = 0xff4d4d): void {
    if (!this.map) return
    const idx = this.map.nodes.findIndex((n) => n.id === nodeId)
    if (idx === -1) return
    const node = this.map.nodes[idx]
    const pos = this.getNodeWorldPos(node)
    const radius = this.getNodeWorldRadius(node)

    const gfx = this.scene.add.graphics()
    gfx.setDepth(4)
    gfx.lineStyle(3, color, 0.9)
    gfx.strokeCircle(pos.x, pos.y, radius + 8)

    this.scene.time.delayedCall(1500, () => gfx.destroy())
  }

  destroy(): void {
    this.clearNodes()
    this.clearEditorNode()
    if (this.background) this.background.destroy()
  }
}
