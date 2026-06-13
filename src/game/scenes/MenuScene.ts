import * as Phaser from 'phaser'
import { GameLevel } from '@/game/types'

export interface MenuSceneData {
  levelData?: GameLevel
}

export class MenuScene extends Phaser.Scene {
  private levelData?: GameLevel

  constructor() {
    super({ key: 'MenuScene' })
  }

  init(data: MenuSceneData): void {
    this.levelData = data?.levelData
  }

  create(): void {
    if (this.levelData) {
      this.scene.start('GameScene', { levelData: this.levelData })
      return
    }

    const w = this.cameras.main.width
    const h = this.cameras.main.height

    this.add.text(w / 2, h / 2 - 80, 'CITY MISSION', {
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    this.add.text(w / 2, h / 2 - 30, 'Use the level select screen to play!', {
      fontSize: '16px',
      color: '#aaaaaa',
    }).setOrigin(0.5)

    const playBtn = this.add.text(w / 2, h / 2 + 20, 'PLAY (Quick Start)', {
      fontSize: '32px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 3,
      padding: { x: 20, y: 10 },
    })
    playBtn.setOrigin(0.5)
    playBtn.setInteractive({ useHandCursor: true })
    playBtn.on('pointerover', () => playBtn.setColor('#ffff00'))
    playBtn.on('pointerout', () => playBtn.setColor('#00ff00'))
    playBtn.on('pointerdown', () => {
      this.scene.start('GameScene')
    })

    const editorBtn = this.add.text(w / 2, h / 2 + 80, 'MAP EDITOR', {
      fontSize: '28px',
      color: '#8888ff',
      stroke: '#000000',
      strokeThickness: 3,
    })
    editorBtn.setOrigin(0.5)
    editorBtn.setInteractive({ useHandCursor: true })
    editorBtn.on('pointerover', () => editorBtn.setColor('#ffff00'))
    editorBtn.on('pointerout', () => editorBtn.setColor('#8888ff'))
    editorBtn.on('pointerdown', () => {
      this.scene.start('EditorScene')
    })
  }
}
