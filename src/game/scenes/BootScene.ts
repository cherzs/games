import * as Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    this.load.audio('bgm', '/music/backgroundmusic.mp3')
    this.load.audio('sfx_success', '/music/success.mp3')
    this.load.audio('sfx_running', '/music/running.mp3')
  }

  create(): void {
    this.scene.start('MenuScene')
  }
}

