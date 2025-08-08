'use client'

import * as React from 'react'

interface HighlightProps {
    text: string
    keyword: string
}

export function Highlight({ text, keyword }: HighlightProps) {
    if (!keyword) return <>{text}</>
    const esc = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const re = new RegExp(`(${esc})`, 'gi')
    const parts = text.split(re)
    return (
        <>
            {parts.map((part, i) =>
                re.test(part) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>
            )}
        </>
    )
}
