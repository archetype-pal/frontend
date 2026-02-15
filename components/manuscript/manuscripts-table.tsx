'use client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ManuscriptListItem } from '@/types/manuscript'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-fetch'

import { useEffect, useState } from 'react'

export function ManuscriptsTable() {
  const router = useRouter()
  const [, setError] = useState('')
  const [, setIsLoading] = useState(false)
  const [manuscriptItems, setManuscriptsItems] = useState<ManuscriptListItem[]>(
    []
  )

  useEffect(() => {
    async function fetchManuscriptsTable() {
      try {
        const response = await apiFetch(
          `/api/v1/search/item-parts/facets`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch carousel items')
        }
        const data = await response.json()
        const results = data.results ?? []
        if (Array.isArray(results) && results.length > 0) {
          setManuscriptsItems(results)
        } else {
          throw new Error('No carousel items found')
        }
      } catch (err) {
        setError('Failed to load Manuscript  items')
        console.error('Error fetching Manuscript  items:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchManuscriptsTable()
  }, [])

  return (
    <div className='bg-white border rounded-lg'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Repository City</TableHead>
            <TableHead>Repository</TableHead>
            <TableHead>Shelfmark</TableHead>
            <TableHead>Cat. Num.</TableHead>
            <TableHead>Text Date</TableHead>
            <TableHead>Document Type</TableHead>
            <TableHead className='text-center w-[100px]'>
              Public Images
            </TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Named Beneficiary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {manuscriptItems.map((manuscript, i) => (
            <TableRow 
              key={i}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/manuscripts/${manuscript.id}`)}
            >
              <TableCell>{manuscript.repository_city}</TableCell>
              <TableCell>{manuscript.repository_name}</TableCell>
              <TableCell>{manuscript.shelfmark}</TableCell>
              <TableCell>{manuscript.catalogue_numbers}</TableCell>
              <TableCell>{manuscript.date}</TableCell>
              <TableCell>{manuscript.type}</TableCell>
              <TableCell className='text-center'>
                {manuscript.number_of_images}
              </TableCell>
              <TableCell>{manuscript.issuer_name}</TableCell>
              <TableCell>{manuscript.named_beneficiary}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
