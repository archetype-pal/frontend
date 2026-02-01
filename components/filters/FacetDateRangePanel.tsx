'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FacetDateRangePanelProps = {
  id?: string
  title?: string
  range?: [number, number]
  defaultValue?: [number, number]
  precisionOptions?: { label: string; value: string }[]

  onSearch?: (params: {
    min: number
    max: number
    precision: string
    diff: number
  }) => void
}

export function FacetDateRangePanel({
  id,
  title = 'Text Date',
  defaultValue = [1094, 1250],
  precisionOptions = [
    { label: 'None', value: ' ' },
    { label: 'at most', value: 'at most' },
    { label: 'at least', value: 'at least' },
  ],
  onSearch,
}: FacetDateRangePanelProps) {
  const [expanded, setExpanded] = React.useState<boolean>(true)
  const [sliderValue, setSliderValue] = React.useState<[number, number]>(defaultValue)
  const [precision, setPrecision] = React.useState<string>(precisionOptions[0].value)
  const [year, setYear] = React.useState<number | ''>('')
  const [searchInput, setSearchInput] = React.useState<string>(
    `${defaultValue[0]}x${defaultValue[1]}`
  )
  const [endpointMin, endpointMax] = defaultValue

  const handleSliderChange = (value: number[]) => {
    const [newMin, newMax] = [value[0], value[1]] as [number, number]
    setSliderValue([newMin, newMax])
    setSearchInput(`${newMin}x${newMax}`)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setSearchInput(raw)

    const [minStr, maxStr] = raw.split('x')
    if (minStr != null && maxStr != null) {
      const parsedMin = parseInt(minStr, 10)
      const parsedMax = parseInt(maxStr, 10)
      const [fixedMin, fixedMax] = defaultValue

      if (
        !Number.isNaN(parsedMin) &&
        !Number.isNaN(parsedMax) &&
        parsedMin >= fixedMin &&
        parsedMax <= fixedMax &&
        parsedMin <= parsedMax
      ) {
        setSliderValue([parsedMin, parsedMax])
      }
    }
  }

  const handleSearchSubmit = () => {
    onSearch?.({
      min: sliderValue[0],
      max: sliderValue[1],
      precision,
      diff: precision === '' ? 0 : year === '' ? 0 : year,
    })
  }

  const handlePrecisionChange = (val: string) => {
    setPrecision(val)
    if (val === precisionOptions[0].value) {
      setYear('')
    }
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : ''
    if (precision === precisionOptions[0].value) {
      setYear('')
    } else {
      setYear(val)
    }
  }

  return (
    <div id={id} className="border bg-white rounded shadow-sm">
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <button
          aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4 max-h-48 overflow-y-auto">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit()
                }
              }}
              placeholder="Search text date..."
              className="pl-8"
              aria-label="Date range (min x max)"
            />
          </div>

          <div>
            <Slider
              min={endpointMin}
              max={endpointMax}
              step={1}
              value={sliderValue}
              onValueChange={handleSliderChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span>{endpointMin}</span>
              <span>{endpointMax}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={`${id}-precision`} className="text-sm font-medium">
              Precision (in years)
            </label>
            <div className="flex items-center gap-2">
              <Select
                value={precision}
                onValueChange={handlePrecisionChange}
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
                onChange={handleYearChange}
                placeholder="0"
                aria-label="Year difference"
                disabled={precision === precisionOptions[0].value}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
