'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, X, FolderOpen, Trash2 } from 'lucide-react'
import { useLightboxStore, useWorkspaceImages } from '@/stores/lightbox-store'
import { saveSession, getAllSessions, deleteSession } from '@/lib/lightbox-db'
import type { LightboxSession } from '@/lib/lightbox-db'

interface LightboxSessionManagerProps {
  onClose: () => void
  onLoad?: (sessionId: string) => void
}

export function LightboxSessionManager({
  onClose,
  onLoad,
}: LightboxSessionManagerProps) {
  const { workspaces, currentWorkspaceId } = useLightboxStore()
  const workspaceImages = useWorkspaceImages()
  const [sessions, setSessions] = useState<LightboxSession[]>([])
  const [sessionName, setSessionName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  React.useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const allSessions = await getAllSessions()
      setSessions(allSessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const handleSave = async () => {
    if (!sessionName.trim()) {
      alert('Please enter a session name')
      return
    }

    if (!currentWorkspaceId) {
      alert('No workspace to save')
      return
    }

    setIsLoading(true)
    try {
      const session: LightboxSession = {
        id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: sessionName,
        workspaces: workspaces.filter((w) => w.id === currentWorkspaceId),
        images: workspaceImages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await saveSession(session)
      await loadSessions()
      setSessionName('')
      alert('Session saved successfully')
    } catch (error) {
      console.error('Failed to save session:', error)
      alert('Failed to save session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoad = async (sessionId: string) => {
    try {
      const { loadSession } = useLightboxStore.getState()
      await loadSession(sessionId)
      if (onLoad) {
        onLoad(sessionId)
      }
      onClose()
    } catch (error) {
      console.error('Failed to load session:', error)
      alert('Failed to load session')
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      await deleteSession(sessionId)
      await loadSessions()
    } catch (error) {
      console.error('Failed to delete session:', error)
      alert('Failed to delete session')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Session Manager
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Save New Session */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Save Current Session</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Session name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave()
                  }
                }}
              />
              <Button onClick={handleSave} disabled={isLoading || !sessionName.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          {/* Load Sessions */}
          <div>
            <h4 className="font-medium mb-2">Saved Sessions</h4>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved sessions</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="border rounded-lg p-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{session.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.images.length} images •{' '}
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoad(session.id)}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
