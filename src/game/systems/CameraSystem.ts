import * as Phaser from 'phaser'

export class CameraSystem {
  private scene: Phaser.Scene
  private camera: Phaser.Cameras.Scene2D.Camera

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.camera = scene.cameras.main
  }

  init(boundsWidth: number, boundsHeight: number): void {
    this.camera.setBounds(0, 0, boundsWidth, boundsHeight)
  }

  follow(target: Phaser.GameObjects.Sprite): void {
    this.camera.startFollow(target, true, 0.1, 0.1)
  }

  setZoom(zoom: number): void {
    this.camera.setZoom(zoom)
  }

  zoomIn(): void {
    const newZoom = Math.min(this.camera.zoom + 0.2, 2)
    this.camera.setZoom(newZoom)
  }

  zoomOut(): void {
    const newZoom = Math.max(this.camera.zoom - 0.2, 0.4)
    this.camera.setZoom(newZoom)
  }

  getZoom(): number {
    return this.camera.zoom
  }

  handleResize(width: number, height: number, mapWidth: number, mapHeight: number): void {
    const scaleX = width / mapWidth
    const scaleY = height / mapHeight
    const baseZoom = Math.min(scaleX, scaleY, 1)
    this.camera.setZoom(baseZoom)
    this.camera.setBounds(0, 0, mapWidth, mapHeight)
  }

  destroy(): void {
    this.camera.stopFollow()
  }
}
