import * as Phaser from 'phaser'
import { GameMap, GameLevel } from '@/game/types'
import { MapSystem } from '@/game/systems/MapSystem'
import { MissionSystem } from '@/game/systems/MissionSystem'
import { CharacterSystem } from '@/game/systems/CharacterSystem'
import { CameraSystem } from '@/game/systems/CameraSystem'
import { RoadSystem } from '@/game/systems/RoadSystem'
import { loadMap } from '@/lib/storage'
import { fetchDefaultMap } from '@/game/maps/mapLoader'
import { fetchTemplateLevel, levelToGameMap } from '@/game/levels/levelLoader'
import { ReachabilityChecker, NodeDiagnostic } from '@/game/systems/ReachabilityChecker'
import { PlaytestTracker } from '@/game/systems/PlaytestTracker'
import { AssetGenerator } from '@/game/assets/AssetGenerator'
import { isTypingInFormElement } from '@/game/utils/keyboard'

export interface JoystickProxy {
  current: { setInput: (dx: number, dy: number) => void } | null
}

export interface GameSceneData {
  mapData?: GameMap
  levelData?: GameLevel
  onChange?: (map: GameMap) => void
  onMissionUpdate?: (mission: { nodeName: string; purpose: string; nodeId: string; district?: string } | null) => void
  onComplete?: (count: number) => void
  joystickRef?: JoystickProxy
}

export class GameScene extends Phaser.Scene {
  mapSystem!: MapSystem
  missionSystem!: MissionSystem
  characterSystem!: CharacterSystem
  cameraSystem!: CameraSystem

  private mapData!: GameMap
  private levelBgPath: string = '/maps/maps.png'
  private sceneData: GameSceneData = {}
  private roadSystem!: RoadSystem
  private completeCooldown = 2000

  private overlayGfx!: Phaser.GameObjects.Graphics
  private distText!: Phaser.GameObjects.Text
  private debugText!: Phaser.GameObjects.Text
  private completeFx!: Phaser.GameObjects.Text
  private isDebugMode = false
  private highlightTime = 0
  private completionLocked = false

  private reachGfx!: Phaser.GameObjects.Graphics
  private showReachability = false
  private reachabilityResults: NodeDiagnostic[] = []

  private playtestTracker!: PlaytestTracker

  private bgm!: Phaser.Sound.BaseSound
  private sfxSuccess!: Phaser.Sound.BaseSound
  private sfxRunning!: Phaser.Sound.BaseSound
  private lastRunningSfxTime = 0

  private gameComplete = false
  private levelCompleteText!: Phaser.GameObjects.Text
  private missionCountText!: Phaser.GameObjects.Text

  private showTargetRing = false
  private showMissionArrow = false
  private showDistanceText = true

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: GameSceneData): void {
    this.sceneData = data
  }

  preload(): void {
    const bgPath = this.sceneData.levelData?.background || '/maps/maps.png'
    this.levelBgPath = bgPath

    if (!this.textures.exists('map_bg')) {
      this.load.image('map_bg', bgPath)
    } else {
      this.textures.remove('map_bg')
      this.load.image('map_bg', bgPath)
    }

    this.load.audio('bgm', '/music/backgroundmusic.mp3')
    this.load.audio('sfx_success', '/music/success.mp3')
    this.load.audio('sfx_running', '/music/running.mp3')
  }

  async create(): Promise<void> {
    new AssetGenerator(this).generateAll()

    if (this.sceneData.levelData) {
      this.mapData = levelToGameMap(this.sceneData.levelData)
    } else if (this.sceneData.mapData) {
      this.mapData = this.sceneData.mapData
    } else {
      const saved = loadMap()
      if (saved) {
        this.mapData = saved
      } else {
        try {
          const level = await fetchTemplateLevel('level_1')
          this.mapData = levelToGameMap(level)
        } catch {
          this.mapData = await fetchDefaultMap()
        }
      }
    }

    this.mapSystem = new MapSystem(this)
    this.missionSystem = new MissionSystem(this.mapSystem)
    this.characterSystem = new CharacterSystem(this)
    this.cameraSystem = new CameraSystem(this)

    if (this.sceneData.levelData?.missionOrder) {
      this.missionSystem.loadMissionOrder(this.sceneData.levelData.missionOrder)
    }

    this.mapSystem.loadMap(this.mapData, false)

    this.roadSystem = new RoadSystem()
    this.roadSystem.loadNodes(this.mapData.nodes, this.mapData.width, this.mapData.height)

    const checker = new ReachabilityChecker(this.mapData, this.roadSystem.getSegments())
    this.reachabilityResults = checker.run()
    this.reachGfx = this.add.graphics()
    this.reachGfx.setDepth(9)
    this.reachGfx.setVisible(false)

    this.playtestTracker = new PlaytestTracker(this.reachabilityResults)

    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.4 })
    this.bgm.play()
    this.sfxSuccess = this.sound.add('sfx_success', { volume: 0.7 })
    this.sfxRunning = this.sound.add('sfx_running', { volume: 0.3 })

    const spawnNode = this.sceneData.levelData?.spawn
      ? this.mapData.nodes.find((n) => n.id === 'spawn') ?? this.mapData.nodes[0]
      : (this.mapData.nodes.find((n) => n.id === 'spawn') ?? this.mapData.nodes[0])

    const spawnX = spawnNode ? (spawnNode.x / 100) * this.mapData.width : 1200
    const spawnY = spawnNode ? (spawnNode.y / 100) * this.mapData.height : 765

    this.characterSystem.init()
    this.characterSystem.create(spawnX, spawnY)
    this.characterSystem.setRoadSystem(this.roadSystem)

    this.cameraSystem.init(this.mapData.width, this.mapData.height)
    this.cameraSystem.follow(this.characterSystem.sprite)
    this.cameraSystem.handleResize(
      this.scale.width, this.scale.height,
      this.mapData.width, this.mapData.height,
    )

    this.overlayGfx = this.add.graphics()
    this.overlayGfx.setDepth(8)

    this.distText = this.add.text(14, 72, '', {
      fontSize: '22px',
      fontFamily: '"Arial Black", Arial, sans-serif',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5,
      resolution: 2,
    })
    this.distText.setScrollFactor(0).setDepth(22)

    this.completeFx = this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 60,
      '', {
        fontSize: '42px',
        fontFamily: '"Arial Black", Arial',
        color: '#00FF88',
        stroke: '#000',
        strokeThickness: 8,
        resolution: 2,
        align: 'center',
      },
    )
    this.completeFx.setOrigin(0.5).setScrollFactor(0).setDepth(30).setAlpha(0)

    this.levelCompleteText = this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 60,
      'LEVEL COMPLETE!', {
        fontSize: '64px',
        fontFamily: '"Arial Black", Arial',
        color: '#FFD700',
        stroke: '#000',
        strokeThickness: 10,
        resolution: 2,
        align: 'center',
      },
    )
    this.levelCompleteText.setOrigin(0.5).setScrollFactor(0).setDepth(35).setAlpha(0).setScale(0)

    this.missionCountText = this.add.text(14, 44, '', {
      fontSize: '20px',
      fontFamily: '"Arial Black", Arial, sans-serif',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
      resolution: 2,
    })
    this.missionCountText.setScrollFactor(0).setDepth(22)

    this.debugText = this.add.text(14, 108, '', {
      fontSize: '17px',
      fontFamily: 'monospace',
      color: '#00FF99',
      stroke: '#000',
      strokeThickness: 3,
      backgroundColor: 'rgba(0,0,0,0.72)',
      padding: { x: 8, y: 6 },
      resolution: 2,
    })
    this.debugText.setScrollFactor(0).setDepth(22).setVisible(false)

    this.missionSystem.setOnMissionUpdate((mission) => {
      this.sceneData.onMissionUpdate?.(
        mission
          ? { nodeName: mission.nodeName, purpose: mission.purpose, nodeId: mission.nodeId,
              district: this.mapSystem.getNodeById(mission.nodeId)?.district }
          : null,
      )

      if (mission && this.playtestTracker.running) {
        const node = this.mapSystem.getNodeById(mission.nodeId)
        if (node?.district) {
          this.playtestTracker.setDistrictForNode(mission.nodeId, node.district)
        }
        const state = this.characterSystem.getState()
        this.playtestTracker.recordStart(mission, state.x, state.y)
      }
    })

    this.missionSystem.setOnMissionComplete((mission) => {
      this.mapSystem.highlightNode(mission.nodeId, 0x00ff88)
      this.sceneData.onComplete?.(this.missionSystem.getCompletedCount())
      this.flashCompletion(mission.nodeName)

      if (this.playtestTracker.running) {
        const state = this.characterSystem.getState()
        this.playtestTracker.recordEnd(mission, state.x, state.y)
      }
    })

    this.missionSystem.setOnAllComplete(() => {
      this.showLevelComplete()
    })

    this.missionSystem.generateMission()

    if (this.sceneData.joystickRef) {
      this.sceneData.joystickRef.current = {
        setInput: (dx, dy) => this.characterSystem.setJoystickInput(dx, dy),
      }
    }

    if (this.input.keyboard) {
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
        .on('down', () => {
          if (isTypingInFormElement()) return
          this.cameraSystem.zoomIn()
        })
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
        .on('down', () => {
          if (isTypingInFormElement()) return
          this.cameraSystem.zoomOut()
        })
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3)
        .on('down', () => {
          if (isTypingInFormElement()) return
          this.isDebugMode = !this.isDebugMode
          this.debugText.setVisible(this.isDebugMode)
          if (!this.isDebugMode) this.debugText.setText('')
        })
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1)
        .on('down', () => {
          if (isTypingInFormElement()) return
          this.showReachability = !this.showReachability
          this.reachGfx.setVisible(this.showReachability)
          if (this.showReachability) {
            this.drawReachabilityOverlay()
          }
        })
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P)
        .on('down', () => {
          if (isTypingInFormElement()) return
          if (this.playtestTracker.running) {
            this.playtestTracker.stop()
          } else {
            this.playtestTracker.start()
          }
        })
    }

    this.scale.on('resize', () => {
      this.completeFx.setPosition(this.scale.width / 2, this.scale.height / 2 - 60)
      this.levelCompleteText.setPosition(this.scale.width / 2, this.scale.height / 2 - 60)
    })
  }

  update(_time: number, delta: number): void {
    if (this.gameComplete) return

    this.highlightTime += delta

    this.characterSystem.update(delta, {
      width: this.mapData.width,
      height: this.mapData.height,
    })

    if (!this.completionLocked) {
      const state = this.characterSystem.getState()
      if (this.missionSystem.checkCompletion(state.x, state.y)) {
        this.completionLocked = true
        this.time.delayedCall(this.completeCooldown, () => {
          this.completionLocked = false
          const s = this.characterSystem.getState()
          this.missionSystem.generateMission(s.x, s.y)
        })
      }
    }

    this.drawOverlay()

    if (this.characterSystem.isMoving) {
      const now = this.time.now
      if (now - this.lastRunningSfxTime > 280) {
        this.lastRunningSfxTime = now
        this.sfxRunning.play()
      }
    }
  }

  private drawOverlay(): void {
    this.overlayGfx.clear()

    const mission = this.missionSystem.getCurrentMission()
    if (!mission) {
      this.distText.setText('')
      return
    }

    const { x: px, y: py } = this.characterSystem.getState()
    const { targetX: tx, targetY: ty, nodeName, nodeId } = mission

    const dx = tx - px
    const dy = ty - py
    const dist = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const pulse = 0.5 + 0.5 * Math.sin(this.highlightTime * 0.005)
    const node = this.mapSystem.getNodeById(nodeId)
    const nr = node ? this.mapSystem.getNodeWorldRadius(node) : 60

    if (this.showTargetRing || this.isDebugMode) {
      this.overlayGfx.lineStyle(6, 0xFF6600, 0.45 + 0.45 * pulse)
      this.overlayGfx.strokeCircle(tx, ty, nr + 12 + 10 * pulse)

      this.overlayGfx.lineStyle(3, 0xFFBB44, 0.9)
      this.overlayGfx.strokeCircle(tx, ty, nr + 4)

      if (dist < nr * 3) {
        this.overlayGfx.fillStyle(0xFF8800, 0.12 + 0.12 * pulse)
        this.overlayGfx.fillCircle(tx, ty, nr + 4)
      }
    }

    if (this.showMissionArrow) {
      const STUB = 140
      if (dist > 40) {
        const ax = px + Math.cos(angle) * STUB
        const ay = py + Math.sin(angle) * STUB

        this.overlayGfx.lineStyle(4, 0xFFDD00, 0.88)
        this.overlayGfx.beginPath()
        this.overlayGfx.moveTo(px, py)
        this.overlayGfx.lineTo(ax, ay)
        this.overlayGfx.strokePath()

        const HA = 22
        this.overlayGfx.fillStyle(0xFFDD00, 0.95)
        this.overlayGfx.fillTriangle(
          ax + Math.cos(angle) * HA,              ay + Math.sin(angle) * HA,
          ax + Math.cos(angle + 2.55) * HA * 0.5, ay + Math.sin(angle + 2.55) * HA * 0.5,
          ax + Math.cos(angle - 2.55) * HA * 0.5, ay + Math.sin(angle - 2.55) * HA * 0.5,
        )
      }
    }

    const distM = Math.round(dist / 10)
    if (this.showDistanceText) {
      this.distText.setText(`→ ${distM}m`)
    } else {
      this.distText.setText('')
    }

    const total = this.missionSystem.getTotalCount()
    if (total > 0) {
      this.missionCountText.setText(`${this.missionSystem.getCompletedCount()}/${total}`)
    }

    if (this.isDebugMode) {
      const onRoad = this.roadSystem.isWalkable(px, py)
      const speedMul = this.characterSystem.speedMultiplier
      this.debugText.setText(
        `[D] DEBUG\n` +
        `Player   x:${Math.round(px)}  y:${Math.round(py)}\n` +
        `Target   ${nodeName}\n` +
        `         x:${Math.round(tx)}  y:${Math.round(ty)}\n` +
        `Dist     ${distM}m  (${Math.round(dist)}px)\n` +
        `Radius   ${Math.round(nr)}px\n` +
        `Road     ${onRoad ? '✓ ON ROAD' : '✗ OFF ROAD'}\n` +
        `Speed    x${speedMul.toFixed(2)}`,
      )
    }
  }

  private drawReachabilityOverlay(): void {
    this.reachGfx.clear()

    for (const r of this.reachabilityResults) {
      let color: number
      let alpha: number
      let isProblem = false

      switch (r.status) {
        case 'road_connected':
        case 'road_warning':
          color = 0x00ff44
          alpha = 0.35
          break
        case 'off_road_node':
        case 'no_road_nearby':
          color = 0xffaa00
          alpha = 0.45
          isProblem = true
          break
        case 'invalid':
        default:
          color = 0xff2222
          alpha = 0.55
          isProblem = true
          break
      }

      this.reachGfx.fillStyle(color, alpha * 0.4)
      this.reachGfx.fillCircle(r.worldX, r.worldY, r.radiusPx + 8)

      this.reachGfx.lineStyle(r.status === 'invalid' ? 3 : 2, color, alpha)
      this.reachGfx.strokeCircle(r.worldX, r.worldY, r.radiusPx + 8)

      if (isProblem) {
        const cx = r.worldX
        const cy = r.worldY
        const s = r.radiusPx + 14
        const xColor = r.status === 'invalid' ? 0xff0000 : 0xffaa00
        this.reachGfx.lineStyle(2, xColor, 0.75)
        this.reachGfx.beginPath()
        this.reachGfx.moveTo(cx - s, cy - s)
        this.reachGfx.lineTo(cx + s, cy + s)
        this.reachGfx.strokePath()
        this.reachGfx.beginPath()
        this.reachGfx.moveTo(cx + s, cy - s)
        this.reachGfx.lineTo(cx - s, cy + s)
        this.reachGfx.strokePath()
      }
    }
  }

  private flashCompletion(name: string): void {
    this.sfxSuccess.play()
    this.completeFx.setText(`✓ ${name}!`).setAlpha(1)
    this.tweens.add({
      targets: this.completeFx,
      alpha: 0,
      y: `-=40`,
      duration: 1400,
      ease: 'Power2',
      onComplete: () => {
        this.completeFx.setY(this.scale.height / 2 - 60)
      },
    })
  }

  private showLevelComplete(): void {
    this.gameComplete = true
    this.bgm.stop()

    this.levelCompleteText.setAlpha(0).setScale(0).setVisible(true)

    this.tweens.add({
      targets: this.levelCompleteText,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 600,
      ease: 'Back.easeOut',
    })

    this.tweens.add({
      targets: this.levelCompleteText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 600,
    })
  }

  getMapData(): GameMap {
    return this.mapSystem.getMap()
  }

  shutdown(): void {
    this.mapSystem?.destroy()
    this.missionSystem?.destroy()
    this.characterSystem?.destroy()
    this.cameraSystem?.destroy()
    this.overlayGfx?.destroy()
    this.distText?.destroy()
    this.missionCountText?.destroy()
    this.debugText?.destroy()
    this.completeFx?.destroy()
    this.levelCompleteText?.destroy()
    this.reachGfx?.destroy()
    this.bgm?.stop()
  }
}
