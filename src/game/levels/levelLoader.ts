import { GameLevel, BaseMap } from '@/game/types'

const LEVEL_PATHS: Record<string, string> = {
  level_1: '/levels/level1.json',
  level_2: '/levels/level2.json',
  level_3: '/levels/level3.json',
}

const BASE_MAP_PATH = '/maps/base_map.json'

const levelCache: Map<string, GameLevel> = new Map()
let baseMapCache: BaseMap | null = null

export const TEMPLATE_LEVEL_IDS = ['level_1', 'level_2', 'level_3']

export async function fetchBaseMap(): Promise<BaseMap> {
  if (baseMapCache) return baseMapCache
  const res = await fetch(BASE_MAP_PATH)
  baseMapCache = await res.json()
  return baseMapCache!
}

export async function fetchTemplateLevel(levelId: string): Promise<GameLevel> {
  if (levelCache.has(levelId)) return levelCache.get(levelId)!

  const path = LEVEL_PATHS[levelId]
  if (!path) throw new Error(`Unknown template level: ${levelId}`)

  const [levelRes, baseMap] = await Promise.all([
    fetch(path),
    fetchBaseMap(),
  ])

  const levelData: GameLevel = await levelRes.json()

  const merged: GameLevel = {
    ...levelData,
    baseMap,
    background: levelData.background || baseMap.backgroundImage,
    mapWidth: levelData.mapWidth || baseMap.width,
    mapHeight: levelData.mapHeight || baseMap.height,
  }

  levelCache.set(levelId, merged)
  return merged
}

export function normalizeLevel(level: GameLevel): GameLevel {
  return {
    ...level,
    nodes: level.nodes.map((n) => ({
      ...n,
      x: Number(n.x),
      y: Number(n.y),
      radius: Number(n.radius),
    })),
  }
}

export function levelToGameMap(level: GameLevel) {
  return {
    id: level.id,
    name: level.name,
    width: level.mapWidth,
    height: level.mapHeight,
    background: level.background,
    nodes: level.nodes,
  }
}
