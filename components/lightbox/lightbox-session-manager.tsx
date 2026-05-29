'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, FolderOpen, Globe, Link2, Lock, Save, Trash2, X } from 'lucide-react';
import { useLightboxStore, useWorkspaceImages } from '@/stores/lightbox-store';
import { saveSession, getAllSessions, deleteSession } from '@/lib/lightbox-db';
import type { LightboxSession } from '@/lib/lightbox-db';
import { useAuth } from '@/contexts/auth-context';
import { env } from '@/lib/env';
import {
  createWorkset,
  deleteWorkset,
  getWorkset,
  listMyWorksets,
  updateWorkset,
} from '@/services/worksets';
import type { WorksetSummary } from '@/types/workset';
import { WORKSET_SCHEMA_VERSION } from '@/types/workset';

interface LightboxSessionManagerProps {
  onClose: () => void;
  onLoad?: (sessionId: string) => void;
}

export function LightboxSessionManager({ onClose, onLoad }: LightboxSessionManagerProps) {
  const { workspaces, currentWorkspaceId } = useLightboxStore();
  const workspaceImages = useWorkspaceImages();
  const { token } = useAuth();
  const [sessions, setSessions] = useState<LightboxSession[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Server worksets (only relevant when signed in).
  const [worksets, setWorksets] = useState<WorksetSummary[]>([]);
  const [worksetName, setWorksetName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  // public_ids with an in-flight visibility toggle, to block out-of-order PATCHes.
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    loadSessions();
  }, []);

  const refreshWorksets = React.useCallback(async () => {
    if (!token) return;
    try {
      setWorksets(await listMyWorksets(token));
    } catch (error) {
      console.error('Failed to load worksets:', error);
    }
  }, [token]);

  React.useEffect(() => {
    refreshWorksets();
  }, [refreshWorksets]);

  const loadSessions = async () => {
    try {
      const allSessions = await getAllSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  /** The current workspace + its images, in the shared serialization shape. */
  const buildPayload = () => ({
    schema_version: WORKSET_SCHEMA_VERSION,
    workspaces: workspaces.filter((w) => w.id === currentWorkspaceId),
    images: workspaceImages,
  });

  const handleSave = async () => {
    if (!sessionName.trim()) {
      toast.error('Please enter a session name');
      return;
    }

    if (!currentWorkspaceId) {
      toast.error('No workspace to save');
      return;
    }

    setIsLoading(true);
    try {
      const session: LightboxSession = {
        id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: sessionName,
        workspaces: workspaces.filter((w) => w.id === currentWorkspaceId),
        images: workspaceImages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveSession(session);
      await loadSessions();
      setSessionName('');
      toast.success('Session saved successfully');
    } catch (error) {
      console.error('Failed to save session:', error);
      toast.error('Failed to save session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async (sessionId: string) => {
    try {
      const { loadSession } = useLightboxStore.getState();
      await loadSession(sessionId);
      if (onLoad) {
        onLoad(sessionId);
      }
      onClose();
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error('Failed to load session');
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await deleteSession(sessionId);
      await loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleSaveToServer = async () => {
    if (!token) return;
    if (!worksetName.trim()) {
      toast.error('Please enter a workset name');
      return;
    }
    if (!currentWorkspaceId) {
      toast.error('No workspace to save');
      return;
    }
    setIsSyncing(true);
    try {
      await createWorkset(token, { title: worksetName.trim(), payload: buildPayload() });
      setWorksetName('');
      await refreshWorksets();
      toast.success('Workset saved to your account');
    } catch (error) {
      toast.error('Failed to save workset', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadWorkset = async (publicId: string) => {
    if (!token) return;
    try {
      const detail = await getWorkset(publicId);
      if (!detail) {
        toast.error('Workset not found');
        return;
      }
      // Owner is loading to keep editing → persist into Dexie.
      await useLightboxStore.getState().loadWorksetPayload(detail.payload, { persist: true });
      onClose();
    } catch {
      toast.error('Failed to load workset');
    }
  };

  const handleDeleteWorkset = async (publicId: string) => {
    if (!token) return;
    if (!confirm('Delete this server workset? This cannot be undone.')) return;
    try {
      await deleteWorkset(token, publicId);
      await refreshWorksets();
    } catch {
      toast.error('Failed to delete workset');
    }
  };

  const handleToggleVisibility = async (workset: WorksetSummary) => {
    if (!token || togglingIds.has(workset.public_id)) return;
    const next = workset.visibility === 'Public' ? 'Private' : 'Public';
    setTogglingIds((prev) => new Set(prev).add(workset.public_id));
    try {
      const updated = await updateWorkset(token, workset.public_id, { visibility: next });
      // Reflect server truth from the response itself, so the Share button is
      // enabled/disabled correctly even if a follow-up refetch fails.
      setWorksets((prev) =>
        prev.map((w) =>
          w.public_id === updated.public_id ? { ...w, visibility: updated.visibility } : w
        )
      );
    } catch {
      toast.error('Failed to update visibility');
    } finally {
      setTogglingIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(workset.public_id);
        return nextSet;
      });
    }
  };

  const handleShare = async (workset: WorksetSummary) => {
    const url = `${env.siteUrl}/worksets/${workset.public_id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Shareable link copied to clipboard');
    } catch {
      toast.error('Could not copy link', { description: url });
    }
  };

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
                    handleSave();
                  }
                }}
              />
              <Button onClick={handleSave} disabled={isLoading || !sessionName.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Saved locally in this browser only.
            </p>
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
                      <Button variant="ghost" size="sm" onClick={() => handleLoad(session.id)}>
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(session.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Server worksets — only for signed-in users */}
          {token ? (
            <div className="border-t pt-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Save to your account
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Workset name"
                    value={worksetName}
                    onChange={(e) => setWorksetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveToServer();
                    }}
                  />
                  <Button onClick={handleSaveToServer} disabled={isSyncing || !worksetName.trim()}>
                    <Cloud className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Synced to your account; make a workset public to share a citable link.
                </p>
              </div>

              <div className="mt-3">
                <h4 className="font-medium mb-2">Your worksets</h4>
                {worksets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No server worksets yet</p>
                ) : (
                  <div className="space-y-2">
                    {worksets.map((workset) => {
                      const isPublic = workset.visibility === 'Public';
                      return (
                        <div
                          key={workset.public_id}
                          className="border rounded-lg p-3 flex items-center justify-between hover:bg-gray-50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{workset.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {isPublic ? 'Public' : 'Private'} •{' '}
                              {new Date(workset.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleVisibility(workset)}
                              disabled={togglingIds.has(workset.public_id)}
                              title={isPublic ? 'Make private' : 'Make public'}
                            >
                              {isPublic ? (
                                <Globe className="h-4 w-4" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShare(workset)}
                              disabled={!isPublic}
                              title={
                                isPublic ? 'Copy shareable link' : 'Make public to share a link'
                              }
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoadWorkset(workset.public_id)}
                              title="Load this workset"
                            >
                              <FolderOpen className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteWorkset(workset.public_id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
