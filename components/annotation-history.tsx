import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Annotation {
  id: string
  type: string
  deleted?: boolean
}

interface AnnotationHistoryProps {
  history: Annotation[]
}

export default function AnnotationHistory({ history }: AnnotationHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Annotation History</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className='space-y-2'>
          {history.map((annotation, index) => (
            <li
              key={`${annotation.id}-${index}`}
              className='flex justify-between items-center'
            >
              <span>
                {annotation.type} - {annotation.id.slice(0, 8)}
              </span>
              <span>{annotation.deleted ? 'Deleted' : 'Modified'}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
