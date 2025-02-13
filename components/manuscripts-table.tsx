'use client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import type { ManuscriptListItem } from '@/types/manuscript'
import Link from 'next/link'

import { useEffect, useState } from 'react'

export function ManuscriptsTable() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [manuscriptItems, setManuscriptsItems] = useState<ManuscriptListItem[]>(
    []
  )

  useEffect(() => {
    async function fetchManuscriptsTable() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/search/item-parts/facets`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch carousel items')
        }
        const data = await response.json()
        if (
          data &&
          data.objects &&
          Array.isArray(data.objects.results) &&
          data.objects.results.length > 0
        ) {
          console.log('data.objects.results', data.objects.results)

          setManuscriptsItems(data.objects.results)
        } else {
          throw new Error('No carousel items found')
        }
      } catch (err) {
        setError('Failed to load carousel items')
        console.error('Error fetching carousel items:', err)
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
            <TableHead className='w-[80px]'>View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {manuscriptItems.map((manuscript, i) => (
            <TableRow key={i}>
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
              <TableCell>
                <Link href={`/manuscripts/${manuscript.id}`}>
                  <Button variant='outline' size='sm'>
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* <div className='flex items-center justify-between p-4 border-t'>
        <div className='flex items-center space-x-2'>
          <select
            className='rounded-md border px-2 py-1 text-sm'
            defaultValue='10'
          >
            <option value='10'>10 / pages</option>
            <option value='20'>20 / pages</option>
            <option value='50'>50 / pages</option>
          </select>
          <div className='flex items-center space-x-1'>
            {[1, 2, 3, '...', 70, 71, 72].map((page, i) => (
              <Button
                key={i}
                variant={page === 1 ? 'secondary' : 'ghost'}
                size='sm'
                className='w-8 h-8'
              >
                {page}
              </Button>
            ))}
          </div>
        </div>
      </div> */}
    </div>
  )
}
