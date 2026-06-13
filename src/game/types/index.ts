export interface MapNode {
  id: string
  name: string
  type: string
  purpose: string
  x: number
  y: number
  radius: number
  district?: string
  icon?: string
  assetId?: string
  color?: string
  notes?: string
}

export interface GameMap {
  id: string
  name: string
  width: number
  height: number
  background: string
  nodes: MapNode[]
}

export type LevelKind = 'template' | 'custom'

export interface BaseMap {
  id: string
  name: string
  width: number
  height: number
  backgroundImage: string
  spawnX: number
  spawnY: number
}

export interface GameLevel {
  id: string
  name: string
  kind: LevelKind
  baseMapId: string
  baseMap?: BaseMap
  background: string
  mapWidth: number
  mapHeight: number
  spawn: {
    x: number
    y: number
  }
  nodes: MapNode[]
  roads?: Road[]
  missionOrder?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface Road {
  from: string
  to: string
}

export interface Mission {
  id: string
  nodeId: string
  nodeName: string
  nodeType: string
  purpose: string
  targetX: number
  targetY: number
  completed: boolean
}

export interface PlayerState {
  x: number
  y: number
  speed: number
}

export interface EditorAction {
  type: 'add' | 'edit' | 'delete' | 'drag'
  node?: MapNode
  nodeId?: string
  newPosition?: { x: number; y: number }
}

export interface GameState {
  player: PlayerState
  currentMission: Mission | null
  completedMissions: number
  map: GameMap | null
  isEditorMode: boolean
}

export interface GameRef {
  getScene: () => unknown
  getMapData: () => GameMap | null
  editNode: (id: string, updates: Record<string, unknown>) => void
  deleteNode: (id: string) => void
  exportMap: () => GameMap | null
  importMap: (map: GameMap) => void
  selectNode: (id: string) => void
}
