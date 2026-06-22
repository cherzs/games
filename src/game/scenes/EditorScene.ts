import * as Phaser from 'phaser'
import { GameMap, GameLevel, MapNode } from '@/game/types'
import { MapSystem } from '@/game/systems/MapSystem'
import { EditorSystem } from '@/game/systems/EditorSystem'
import { loadMap } from '@/lib/storage'
import { fetchDefaultMap } from '@/game/maps/mapLoader'
import { fetchTemplateLevel, levelToGameMap } from '@/game/levels/levelLoader'
import { AssetGenerator } from '@/game/assets/AssetGenerator'
import { isTypingInFormElement } from '@/game/utils/keyboard'

export interface EditorSceneData {
  mapData?: GameMap
  levelData?: GameLevel
  onMapChange?: (map: GameMap) => void
  onNodeSelect?: (node: MapNode | undefined) => void
  onNotice?: (msg: string) => void
  readOnly?: boolean
  placementOnly?: boolean
}

export class EditorScene extends Phaser.Scene {
  mapSystem!: MapSystem
  editorSystem!: EditorSystem
  private mapData!: GameMap
  private sceneData: EditorSceneData = {}

  constructor() {
    super({ key: 'EditorScene' })
  }

  init(data: EditorSceneData): void {
    this.sceneData = data
  }

  preload(): void {
    const bgPath = this.sceneData.levelData?.background || '/maps/maps.png'

    if (!this.textures.exists('map_bg')) {
      this.load.image('map_bg', bgPath)
    }
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
    this.editorSystem = new EditorSystem(this, this.mapSystem)

    this.mapSystem.loadMap(this.mapData)

    this.editorSystem.setOnChange((map) => {
      this.sceneData.onMapChange?.(map)
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldX = pointer.worldX
      const worldY = pointer.worldY

      const clickedNode = this.editorSystem.findNodeAtPosition(worldX, worldY)
      if (clickedNode) {
        this.editorSystem.selectNode(clickedNode.id)
        if (!this.sceneData.readOnly) {
          this.editorSystem.startDrag(worldX, worldY)
        }
        this.sceneData.onNodeSelect?.(clickedNode)
        return
      }

      this.editorSystem.deselectNode()
      this.sceneData.onNodeSelect?.(undefined)
      if (this.sceneData.readOnly || this.sceneData.placementOnly) {
        return
      }
      this.editorSystem.addNode(worldX, worldY)
      this.sceneData.onNotice?.('Node added!')

      const newSel = this.editorSystem.getSelectedNode()
      if (newSel) this.sceneData.onNodeSelect?.(newSel)
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.sceneData.readOnly && pointer.isDown && this.editorSystem.getIsDragging()) {
        this.editorSystem.updateDrag(pointer.worldX, pointer.worldY)
      }
    })

    this.input.on('pointerup', () => {
      this.editorSystem.stopDrag()
    })

    let dragCam = false
    let dragStart = { x: 0, y: 0 }
    let camScrollStart = { x: 0, y: 0 }

    if (this.input.keyboard) {
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          dragCam = true
          dragStart = { x: pointer.x, y: pointer.y }
          camScrollStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY }
        }
      })

      this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.rightButtonDown()) {
          dragCam = false
        }
      })

      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (dragCam && pointer.isDown) {
          const dx = pointer.x - dragStart.x
          const dy = pointer.y - dragStart.y
          this.cameras.main.scrollX = camScrollStart.x - dx / this.cameras.main.zoom
          this.cameras.main.scrollY = camScrollStart.y - dy / this.cameras.main.zoom
        }
      })

      const zoomInKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
      const zoomOutKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)

      zoomInKey.on('down', () => {
        if (isTypingInFormElement()) return
        this.cameras.main.setZoom(Math.min(this.cameras.main.zoom + 0.2, 2))
      })
      zoomOutKey.on('down', () => {
        if (isTypingInFormElement()) return
        this.cameras.main.setZoom(Math.max(this.cameras.main.zoom - 0.2, 0.3))
      })
    }

    this.cameras.main.setBounds(0, 0, this.mapData.width, this.mapData.height)

    const initZoom = Math.min(
      this.scale.width / this.mapData.width,
      this.scale.height / this.mapData.height,
      1
    )
    this.cameras.main.setZoom(initZoom)

    const notice = this.sceneData.readOnly
      ? 'Template locked. Select nodes to inspect. Right-drag to pan.'
      : this.sceneData.placementOnly
        ? 'Placement mode. Drag nodes or edit X/Y, then Save & Lock. Right-drag to pan.'
        : 'Click to add nodes. Drag to move. Right-drag to pan.'
    this.sceneData.onNotice?.(notice)
  }

  getEditorSystem(): EditorSystem {
    return this.editorSystem
  }

  getMapSystem(): MapSystem {
    return this.mapSystem
  }

  shutdown(): void {
    this.mapSystem?.destroy()
    this.editorSystem?.destroy()
  }
}
