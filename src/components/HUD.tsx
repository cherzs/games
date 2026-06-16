'use client'

interface MissionInfo {
  nodeName: string
  purpose: string
  nodeId: string
  district?: string
}

interface HUDProps {
  mission: MissionInfo | null
  completedCount: number
}

const PURPOSE_ICON: Record<string, string> = {
  eat: '🍽', shop: '🛍', work: '💼', rest: '🌿',
  visit: '📍', deliver: '📦', play: '🎮', social: '👥', service: '🔧',
}

const PURPOSE_LABEL: Record<string, string> = {
  eat: 'Eat', shop: 'Shop', work: 'Work', rest: 'Rest',
  visit: 'Visit', deliver: 'Deliver', play: 'Play', social: 'Social', service: 'Service',
}

export default function HUD({ mission, completedCount }: HUDProps) {
  const icon = mission ? (PURPOSE_ICON[mission.purpose] ?? '📍') : ''
  const purposeLabel = mission ? (PURPOSE_LABEL[mission.purpose] ?? mission.purpose) : ''

  return (
    <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none z-10">
      <div className="flex justify-between items-start gap-2">

        {/* Mission panel */}
        <div className="bg-black/65 backdrop-blur-sm rounded-xl px-4 py-2 min-w-[200px]">
          <div className="text-white text-sm font-bold leading-tight">
            Missions:{' '}
            <span className="text-green-400 text-base">{completedCount}</span>
          </div>

          {mission ? (
            <div className="mt-1 space-y-0.5">
              {mission.district && (
                <div className="text-yellow-400/80 text-[10px] uppercase tracking-widest font-semibold">
                  {mission.district}
                </div>
              )}
              <div className="text-white text-sm font-semibold">
                {icon} {mission.nodeName}
              </div>
              <div className="text-gray-300 text-xs">
                {purposeLabel}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-xs mt-1">No active mission</div>
          )}
        </div>

        {/* Controls hint */}
        <div className="bg-black/55 backdrop-blur-sm rounded-xl px-3 py-2 text-gray-300 text-xs leading-relaxed">
          <div>WASD / Arrows — move</div>
          <div>Q / E — zoom out / in</div>
          <div><span className="text-yellow-300">D</span> — debug overlay</div>
          <div><span className="text-yellow-300">R</span> — reachability check</div>
          <div><span className="text-yellow-300">P</span> — playtest mode</div>
        </div>

      </div>
    </div>
  )
}
