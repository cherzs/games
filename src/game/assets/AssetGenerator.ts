import * as Phaser from 'phaser'

const CHARS = 64
const TILE = 64

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

export class AssetGenerator {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  generateAll(): void {
    this.generateCharacterFrames()
    this.generateMapTiles()
  }

  private makeCanvas(key: string, w: number, h: number): CanvasRenderingContext2D | null {
    const tex = this.scene.textures.createCanvas(key, w, h)
    if (!tex) return null
    tex.context.clearRect(0, 0, w, h)
    return tex.context
  }

  private generateCharacterFrames(): void {
    const colors = {
      hair: '#4a3728',
      skin: '#f3c6a5',
      shirt: '#4488cc',
      pants: '#3a4a6e',
      shoe: '#2a2a2a',
    }

    for (let f = 0; f < 4; f++) {
      const ctx = this.makeCanvas(`char_${f}`, CHARS, CHARS)
      if (!ctx) continue
      this.drawCharacter(ctx, f, colors)
      ;(this.scene.textures.get(`char_${f}`) as Phaser.Textures.CanvasTexture)?.refresh()
    }
  }

  private drawCharacter(
    ctx: CanvasRenderingContext2D,
    frame: number,
    c: Record<string, string>,
  ): void {
    const dx = CHARS / 2
    const bob = Math.sin((frame / 4) * Math.PI * 2) * 1.5
    const legAngle = [0, -6, 0, 6][frame]
    const armAngle = [0, 6, 0, -6][frame]

    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.ellipse(dx, 42, 12, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = c.pants
    ctx.fillRect(dx - 7, 28 + bob, 5, 12 + legAngle / 2)
    ctx.fillRect(dx + 2, 28 + bob, 5, 12 - legAngle / 2)
    ctx.fillStyle = c.shoe
    ctx.fillRect(dx - 8, 38 + legAngle / 2 + bob, 7, 4)
    ctx.fillRect(dx + 1, 38 - legAngle / 2 + bob, 7, 4)

    ctx.fillStyle = c.shirt
    roundRect(ctx, dx - 8, 14 + bob, 16, 15, 3)
    ctx.fill()

    ctx.fillStyle = c.shirt
    ctx.save()
    ctx.translate(dx - 8, 18 + bob)
    ctx.rotate(-0.3 + (armAngle / 20))
    ctx.fillRect(-3, 0, 7, 3)
    ctx.restore()
    ctx.save()
    ctx.translate(dx + 8, 18 + bob)
    ctx.rotate(0.3 - (armAngle / 20))
    ctx.fillRect(-4, 0, 7, 3)
    ctx.restore()
    ctx.fillStyle = c.skin
    ctx.fillRect(dx - 15 - armAngle, 20 + bob, 5, 5)
    ctx.fillRect(dx + 10 + armAngle, 20 + bob, 5, 5)

    ctx.fillStyle = c.skin
    ctx.beginPath()
    ctx.arc(dx, 7 + bob, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = c.hair
    ctx.beginPath()
    ctx.arc(dx, 4 + bob, 8, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(dx - 8, 3 + bob, 4, 5)
    ctx.fillRect(dx + 4, 3 + bob, 4, 5)

    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(dx + 4, 5 + bob, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  private generateMapTiles(): void {
    this.makeGrassTile('tile_grass', TILE)
    this.makeRoadTileH('tile_road_h', TILE)
    this.makeRoadTileV('tile_road_v', TILE)
    this.makeRoadTileX('tile_road_x', TILE)
  }

  private makeGrassTile(key: string, s: number): void {
    const ctx = this.makeCanvas(key, s, s)
    if (!ctx) return
    ctx.fillStyle = '#4a7c59'
    ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 30; i++) {
      const gx = Math.random() * s
      const gy = Math.random() * s
      const shade = 55 + Math.random() * 45
      ctx.strokeStyle = `rgb(${shade},${100 + Math.random() * 60},${65 + Math.random() * 50})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(gx, gy)
      ctx.lineTo(gx + Math.random() * 5 - 2.5, gy - 5 - Math.random() * 5)
      ctx.stroke()
    }
    ;(this.scene.textures.get(key) as Phaser.Textures.CanvasTexture)?.refresh()
  }

  private makeRoadTileH(key: string, s: number): void {
    const ctx = this.makeCanvas(key, s, s)
    if (!ctx) return
    ctx.fillStyle = '#4f4f4f'
    ctx.fillRect(0, 0, s, s)
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1
    ctx.strokeRect(1, 1, s - 2, s - 2)
    ctx.strokeStyle = '#e0c030'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    ctx.beginPath()
    ctx.moveTo(0, s / 2)
    ctx.lineTo(s, s / 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#8a8a8a'
    ctx.fillRect(0, 0, s, 3)
    ctx.fillRect(0, s - 3, s, 3)
    ;(this.scene.textures.get(key) as Phaser.Textures.CanvasTexture)?.refresh()
  }

  private makeRoadTileV(key: string, s: number): void {
    const ctx = this.makeCanvas(key, s, s)
    if (!ctx) return
    ctx.fillStyle = '#4f4f4f'
    ctx.fillRect(0, 0, s, s)
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1
    ctx.strokeRect(1, 1, s - 2, s - 2)
    ctx.strokeStyle = '#e0c030'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    ctx.beginPath()
    ctx.moveTo(s / 2, 0)
    ctx.lineTo(s / 2, s)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#8a8a8a'
    ctx.fillRect(0, 0, 3, s)
    ctx.fillRect(s - 3, 0, 3, s)
    ;(this.scene.textures.get(key) as Phaser.Textures.CanvasTexture)?.refresh()
  }

  private makeRoadTileX(key: string, s: number): void {
    const ctx = this.makeCanvas(key, s, s)
    if (!ctx) return
    ctx.fillStyle = '#4f4f4f'
    ctx.fillRect(0, 0, s, s)
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1
    ctx.strokeRect(1, 1, s - 2, s - 2)
    ;(this.scene.textures.get(key) as Phaser.Textures.CanvasTexture)?.refresh()
  }
}
