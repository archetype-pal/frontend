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
import Link from 'next/link'
import type { ManuscriptListItem } from '@/types/manuscript'

export function ManuscriptsTable({ results = [] }: { results: ManuscriptListItem[] }) {
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
            <TableHead className='text-center w-[100px]'>Public Images</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead>Named Beneficiary</TableHead>
            <TableHead className='w-[80px]'>View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((manuscript, i) => (
            <TableRow key={i}>
              <TableCell>{manuscript.repository_city}</TableCell>
              <TableCell>{manuscript.repository_name}</TableCell>
              <TableCell>{manuscript.shelfmark}</TableCell>
              <TableCell>{manuscript.catalogue_numbers}</TableCell>
              <TableCell>{manuscript.date}</TableCell>
              <TableCell>{manuscript.type}</TableCell>
              <TableCell className='text-center'>{manuscript.number_of_images}</TableCell>
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
    </div>
  )
}
