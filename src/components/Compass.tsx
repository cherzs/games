'use client'

export default function Compass() {
  return (
    <div className="absolute bottom-4 right-4 pointer-events-none z-10">
      <div className="bg-black/55 backdrop-blur-sm rounded-full w-[72px] h-[72px] flex items-center justify-center">
        <svg width="56" height="56" viewBox="-28 -28 56 56">
          <circle cx="0" cy="0" r="26" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

          <line x1="0" y1="-26" x2="0" y2="-18" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <line x1="0" y1="26" x2="0" y2="18" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="-26" y1="0" x2="-18" y2="0" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="26" y1="0" x2="18" y2="0" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

          <polygon points="0,-24 6,-8 -6,-8" fill="#FF4444" />
          <polygon points="0,24 5,8 -5,8" fill="rgba(255,255,255,0.35)" />

          <text x="0" y="-30" textAnchor="middle" fill="#FF4444" fontSize="9" fontWeight="bold" fontFamily="Arial">N</text>
          <text x="0" y="37" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="Arial">S</text>
          <text x="-33" y="3" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="Arial">W</text>
          <text x="33" y="3" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="Arial">E</text>
        </svg>
      </div>
    </div>
  )
}
