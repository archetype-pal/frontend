'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Ruler, X } from 'lucide-react'

interface Measurement {
  id: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  distance: number
}

interface LightboxMeasurementToolProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
}

export function LightboxMeasurementTool({
  containerRef,
  onClose,
}: LightboxMeasurementToolProps) {
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [currentMeasurement, setCurrentMeasurement] = useState<{
    start: { x: number; y: number } | null
    end: { x: number; y: number } | null
  }>({ start: null, end: null })
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerRect(el.getBoundingClientRect())
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRect) return
    e.preventDefault()
    const x = e.clientX - containerRect.left
    const y = e.clientY - containerRect.top

    if (!isMeasuring) {
      setIsMeasuring(true)
      setCurrentMeasurement({ start: { x, y }, end: null })
    } else if (currentMeasurement.start) {
      const end = { x, y }
      const distance = Math.hypot(end.x - currentMeasurement.start.x, end.y - currentMeasurement.start.y)
      setMeasurements((prev) => [
        ...prev,
        { id: `measure-${Date.now()}`, start: currentMeasurement.start!, end, distance },
      ])
      setCurrentMeasurement({ start: null, end: null })
      setIsMeasuring(false)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMeasuring || !currentMeasurement.start || !containerRect) return
    const x = e.clientX - containerRect.left
    const y = e.clientY - containerRect.top
    setCurrentMeasurement((prev) => ({ ...prev, end: { x, y } }))
  }

  const clearMeasurements = () => {
    setMeasurements([])
    setCurrentMeasurement({ start: null, end: null })
    setIsMeasuring(false)
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute top-4 left-4 z-50 bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Measurement Tool
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Click on the viewer to start, click again to end a measurement.
          </p>
          {measurements.length > 0 && (
            <div className="space-y-1">
              {measurements.map((m) => (
                <div key={m.id} className="text-xs">
                  Distance: {Math.round(m.distance)}px
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={clearMeasurements}>
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Measurement overlay: same position/size as viewer so coordinates match */}
      {containerRect && (
        <div
          className="fixed z-40"
          style={{
            top: containerRect.top,
            left: containerRect.left,
            width: containerRect.width,
            height: containerRect.height,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isMeasuring && currentMeasurement.start && setCurrentMeasurement((p) => ({ ...p, end: null }))}
        >
          <svg className="w-full h-full block" style={{ overflow: 'visible' }}>
        {/* Existing measurements */}
        {measurements.map((m) => (
          <g key={m.id}>
            <line
              x1={m.start.x}
              y1={m.start.y}
              x2={m.end.x}
              y2={m.end.y}
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="2"
            />
            <circle
              cx={m.start.x}
              cy={m.start.y}
              r="4"
              fill="rgba(59, 130, 246, 0.8)"
            />
            <circle
              cx={m.end.x}
              cy={m.end.y}
              r="4"
              fill="rgba(59, 130, 246, 0.8)"
            />
            <text
              x={(m.start.x + m.end.x) / 2}
              y={(m.start.y + m.end.y) / 2 - 5}
              fill="rgba(59, 130, 246, 1)"
              fontSize="12"
              textAnchor="middle"
            >
              {Math.round(m.distance)}px
            </text>
          </g>
        ))}

        {/* Current measurement */}
        {currentMeasurement.start && currentMeasurement.end && (
          <g>
            <line
              x1={currentMeasurement.start.x}
              y1={currentMeasurement.start.y}
              x2={currentMeasurement.end.x}
              y2={currentMeasurement.end.y}
              stroke="rgba(239, 68, 68, 0.8)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle
              cx={currentMeasurement.start.x}
              cy={currentMeasurement.start.y}
              r="4"
              fill="rgba(239, 68, 68, 0.8)"
            />
            <text
              x={(currentMeasurement.start.x + currentMeasurement.end.x) / 2}
              y={(currentMeasurement.start.y + currentMeasurement.end.y) / 2 - 5}
              fill="rgba(239, 68, 68, 1)"
              fontSize="12"
              textAnchor="middle"
            >
              {Math.round(
                Math.sqrt(
                  Math.pow(
                    currentMeasurement.end.x - currentMeasurement.start.x,
                    2
                  ) +
                    Math.pow(
                      currentMeasurement.end.y - currentMeasurement.start.y,
                      2
                    )
                )
              )}
              px
            </text>
          </g>
        )}
          </svg>
        </div>
      )}
    </div>
  )
}
