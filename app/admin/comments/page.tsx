'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/admin/common/confirm-dialog'
import {
  getComments,
  approveComment,
  rejectComment,
  deleteComment,
} from '@/services/admin/publications'
import type { CommentItem } from '@/types/admin'

export default function CommentsPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'comments', filter],
    queryFn: () =>
      getComments(
        token!,
        filter === 'all'
          ? undefined
          : { is_approved: filter === 'approved' }
      ),
    enabled: !!token,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] })

  const approveMut = useMutation({
    mutationFn: (id: number) => approveComment(token!, id),
    onSuccess: invalidate,
  })

  const rejectMut = useMutation({
    mutationFn: (id: number) => rejectComment(token!, id),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteComment(token!, id),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
    },
  })

  const comments = data?.results ?? []

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <MessageSquare className='h-6 w-6 text-primary' />
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Comment Moderation
          </h1>
          <p className='text-sm text-muted-foreground'>
            {data?.count ?? '...'} comments
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className='flex items-center gap-2'>
        <Filter className='h-4 w-4 text-muted-foreground' />
        {(['all', 'pending', 'approved'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size='sm'
            onClick={() => setFilter(f)}
            className='capitalize'
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Comment list */}
      <div className='space-y-2'>
        {comments.length === 0 ? (
          <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
            <p className='text-sm'>No comments to show.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className='rounded-lg border p-4 space-y-2'
            >
              <div className='flex items-start justify-between'>
                <div className='space-y-0.5'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium text-sm'>
                      {comment.author_name}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {comment.author_email}
                    </span>
                    {comment.is_approved ? (
                      <Badge
                        variant='default'
                        className='text-[10px] gap-0.5'
                      >
                        <CheckCircle className='h-3 w-3' />
                        Approved
                      </Badge>
                    ) : (
                      <Badge
                        variant='secondary'
                        className='text-[10px] gap-0.5'
                      >
                        <Clock className='h-3 w-3' />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    on &ldquo;{comment.post_title}&rdquo; &middot;{' '}
                    {new Date(comment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className='flex items-center gap-1'>
                  {!comment.is_approved && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 text-xs text-green-600 hover:text-green-700'
                      onClick={() => approveMut.mutate(comment.id)}
                      disabled={approveMut.isPending}
                    >
                      <CheckCircle className='h-3.5 w-3.5 mr-1' />
                      Approve
                    </Button>
                  )}
                  {comment.is_approved && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 text-xs text-amber-600 hover:text-amber-700'
                      onClick={() => rejectMut.mutate(comment.id)}
                      disabled={rejectMut.isPending}
                    >
                      <XCircle className='h-3.5 w-3.5 mr-1' />
                      Reject
                    </Button>
                  )}
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 text-muted-foreground hover:text-destructive'
                    onClick={() => setDeleteTarget(comment)}
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>
              </div>
              <p className='text-sm whitespace-pre-wrap'>{comment.content}</p>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title='Delete this comment?'
        description={`Comment by "${deleteTarget?.author_name}" will be permanently deleted.`}
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}
