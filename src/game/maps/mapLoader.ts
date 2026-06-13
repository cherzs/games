import { GameMap } from '@/game/types'
import { fetchTemplateLevel, levelToGameMap } from '@/game/levels/levelLoader'

const DEFAULT_MAP_PATH = '/maps/default.json'
let cachedMap: GameMap | null = null

export async function fetchDefaultMap(): Promise<GameMap> {
  if (cachedMap) return cachedMap
  const res = await fetch(DEFAULT_MAP_PATH)
  cachedMap = await res.json()
  return cachedMap!
}

export function getDefaultMapSync(): GameMap | null {
  return cachedMap
}

export function normalizeMap(map: GameMap): GameMap {
  return {
    ...map,
    nodes: map.nodes.map((n) => ({
      ...n,
      x: Number(n.x),
      y: Number(n.y),
      radius: Number(n.radius),
    })),
  }
}

export async function fetchDefaultLevel(): Promise<GameMap> {
  const level = await fetchTemplateLevel('level_1')
  return levelToGameMap(level)
}
