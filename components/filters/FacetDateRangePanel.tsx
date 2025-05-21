'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FacetDateRangePanelProps = {
  id?: string
  title?: string
  range?: [number, number]
  defaultValue?: [number, number]
  precisionOptions?: { label: string; value: string }[]
  onSearch?: (value: string) => void
  onRangeChange?: (range: {
    min: number
    max: number
    precision: string
    diff: number
  }) => void
  onPrecisionChange?: (precision: string) => void
}

export function FacetDateRangePanel({
  title = 'Text Date',
  range = [1094, 1250],
  defaultValue = [1094, 1250],
  precisionOptions = [
    { label: 'at most', value: 'lte' },
    { label: 'at least', value: 'gte' },
  ],
  onSearch,
  onRangeChange,
  onPrecisionChange,
}: FacetDateRangePanelProps) {
  const [expanded, setExpanded] = React.useState(true)
  const [searchInput, setSearchInput] = React.useState('')
  const [sliderValue, setSliderValue] = React.useState<[number, number]>(defaultValue)
  const [precision, setPrecision] = React.useState(precisionOptions[0].value)
  const [year, setYear] = React.useState<number | ''>('')

  const handleSliderChange = (value: number[]) => {
    const newRange: [number, number] = [value[0], value[1]]
    setSliderValue(newRange)
    onRangeChange?.({
      min: newRange[0],
      max: newRange[1],
      precision,
      diff: year || 0,
    })
  }

  const handleSearchSubmit = () => {
    onSearch?.(searchInput)
  }

  return (
    <div className="border bg-white rounded shadow-sm">
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              placeholder="Search text date..."
              className="pl-8"
            />
          </div>

          {/* Slider */}
          <div>
            <Slider
              min={range[0]}
              max={range[1]}
              step={1}
              value={sliderValue}
              onValueChange={handleSliderChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span>{sliderValue[0]}</span>
              <span>{sliderValue[1]}</span>
            </div>
          </div>

          {/* Precision input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Precision (in years)</label>
            <div className="flex items-center gap-2">
              <Select
                value={precision}
                onValueChange={(val) => {
                  setPrecision(val)
                  onPrecisionChange?.(val)
                  onRangeChange?.({
                    min: sliderValue[0],
                    max: sliderValue[1],
                    precision: val,
                    diff: year || 0,
                  })
                }}
              >
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {precisionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                className="w-20 h-9"
                value={year}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : ''
                  setYear(val)
                  onRangeChange?.({
                    min: sliderValue[0],
                    max: sliderValue[1],
                    precision,
                    diff: val || 0,
                  })
                }}

              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
