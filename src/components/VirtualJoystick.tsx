'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

interface VirtualJoystickProps {
  onInput: (dx: number, dy: number) => void
}

export default function VirtualJoystick({ onInput }: VirtualJoystickProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const baseRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const activeTouchRef = useRef<number | null>(null)
  const baseRectRef = useRef<DOMRect | null>(null)

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const getBaseCenter = useCallback(() => {
    if (!baseRef.current) return { cx: 0, cy: 0 }
    const rect = baseRef.current.getBoundingClientRect()
    baseRectRef.current = rect
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    }
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      if (activeTouchRef.current !== null) return
      const touch = e.changedTouches[0]
      activeTouchRef.current = touch.identifier
      const { cx, cy } = getBaseCenter()
      const dx = touch.clientX - cx
      const dy = touch.clientY - cy
      const maxRadius = 50
      const dist = Math.sqrt(dx * dx + dy * dy)
      const clampedDist = Math.min(dist, maxRadius)
      const nx = dist > 0 ? (dx / dist) * clampedDist : 0
      const ny = dist > 0 ? (dy / dist) * clampedDist : 0

      if (thumbRef.current) {
        thumbRef.current.style.transform = `translate(${nx}px, ${ny}px)`
      }
      onInput(dx / maxRadius, dy / maxRadius)
    },
    [onInput, getBaseCenter]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]
        if (touch.identifier === activeTouchRef.current) {
          const { cx, cy } = getBaseCenter()
          const dx = touch.clientX - cx
          const dy = touch.clientY - cy
          const maxRadius = 50
          const dist = Math.sqrt(dx * dx + dy * dy)
          const clampedDist = Math.min(dist, maxRadius)
          const nx = dist > 0 ? (dx / dist) * clampedDist : 0
          const ny = dist > 0 ? (dy / dist) * clampedDist : 0

          if (thumbRef.current) {
            thumbRef.current.style.transform = `translate(${nx}px, ${ny}px)`
          }
          onInput(dx / maxRadius, dy / maxRadius)
          break
        }
      }
    },
    [onInput, getBaseCenter]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchRef.current) {
          activeTouchRef.current = null
          if (thumbRef.current) {
            thumbRef.current.style.transform = 'translate(0px, 0px)'
          }
          onInput(0, 0)
          break
        }
      }
    },
    [onInput]
  )

  if (!isTouchDevice) return null

  return (
    <div className="absolute bottom-8 left-8 z-20 pointer-events-auto">
      <div
        ref={baseRef}
        className="w-28 h-28 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={thumbRef}
          className="w-12 h-12 rounded-full bg-white/50 transition-transform duration-50"
          style={{ transform: 'translate(0px, 0px)' }}
        />
      </div>
    </div>
  )
}
