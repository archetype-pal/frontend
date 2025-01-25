import * as React from 'react'

interface ToolbarProps {
  children?: React.ReactNode
}

export function Toolbar({ children }: ToolbarProps) {
  return (
    <div className='flex w-12 flex-col items-center gap-1 border  p-2 fixed z-50	bg-white	top-96'>
      {children}
    </div>
  )
}
