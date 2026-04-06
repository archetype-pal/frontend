'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import type { LightboxStickyNote } from '@/lib/lightbox-db';
import { saveStickyNote, getWorkspaceStickyNotes, deleteStickyNote } from '@/lib/lightbox-db';

const NOTE_COLORS = [
  { bg: 'bg-yellow-100', border: 'border-yellow-300', hex: '#fef9c3' },
  { bg: 'bg-blue-100', border: 'border-blue-300', hex: '#dbeafe' },
  { bg: 'bg-green-100', border: 'border-green-300', hex: '#dcfce7' },
  { bg: 'bg-pink-100', border: 'border-pink-300', hex: '#fce7f3' },
  { bg: 'bg-purple-100', border: 'border-purple-300', hex: '#f3e8ff' },
];

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface LightboxStickyNotesProps {
  workspaceId: string;
}

export function LightboxStickyNotes({ workspaceId }: LightboxStickyNotesProps) {
  const [notes, setNotes] = React.useState<LightboxStickyNote[]>([]);
  const [dragState, setDragState] = React.useState<{
    noteId: string;
    offset: { x: number; y: number };
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    getWorkspaceStickyNotes(workspaceId).then((loaded) => {
      if (!cancelled) setNotes(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const addNote = React.useCallback(
    async (x: number, y: number) => {
      const colorIdx = notes.length % NOTE_COLORS.length;
      const now = Date.now();
      const note: LightboxStickyNote = {
        id: generateId(),
        workspaceId,
        text: '',
        color: NOTE_COLORS[colorIdx].hex,
        position: { x, y },
        size: { width: 180, height: 120 },
        createdAt: now,
        updatedAt: now,
      };
      await saveStickyNote(note);
      setNotes((prev) => [...prev, note]);
    },
    [notes.length, workspaceId]
  );

  // Listen for toolbar "add note" events
  React.useEffect(() => {
    const handler = () => addNote(100 + Math.random() * 200, 100 + Math.random() * 100);
    window.addEventListener('lightbox:add-sticky-note', handler);
    return () => window.removeEventListener('lightbox:add-sticky-note', handler);
  }, [addNote]);

  const updateNote = async (id: string, updates: Partial<LightboxStickyNote>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n))
    );
    const note = notes.find((n) => n.id === id);
    if (note) {
      await saveStickyNote({ ...note, ...updates, updatedAt: Date.now() });
    }
  };

  const removeNote = async (id: string) => {
    await deleteStickyNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const noteEl = (e.target as HTMLElement).closest('[data-note-id]') as HTMLElement;
    if (!noteEl) return;
    const rect = noteEl.getBoundingClientRect();
    setDragState({
      noteId,
      offset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    });
  };

  React.useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.lightbox-container');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const x = e.clientX - containerRect.left - dragState.offset.x;
      const y = e.clientY - containerRect.top - dragState.offset.y;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === dragState.noteId
            ? { ...n, position: { x: Math.max(0, x), y: Math.max(0, y) } }
            : n
        )
      );
    };

    const handleMouseUp = () => {
      if (dragState) {
        const note = notes.find((n) => n.id === dragState.noteId);
        if (note) {
          saveStickyNote({ ...note, updatedAt: Date.now() });
        }
      }
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, notes]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only create a note when double-clicking the container background
    if ((e.target as HTMLElement).closest('[data-note-id]')) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    addNote(e.clientX - rect.left, e.clientY - rect.top);
  };

  const colorFor = (hex: string) => NOTE_COLORS.find((c) => c.hex === hex) ?? NOTE_COLORS[0];

  return (
    <div className="absolute inset-0 pointer-events-none" onDoubleClick={handleDoubleClick}>
      {notes.map((note) => {
        const c = colorFor(note.color);
        return (
          <div
            key={note.id}
            data-note-id={note.id}
            className={`absolute pointer-events-auto ${c.bg} ${c.border} border rounded-md shadow-md flex flex-col`}
            style={{
              left: `${note.position.x}px`,
              top: `${note.position.y}px`,
              width: `${note.size.width}px`,
              minHeight: `${note.size.height}px`,
              zIndex: 1000,
              cursor: dragState?.noteId === note.id ? 'grabbing' : 'grab',
            }}
          >
            <div
              className="flex items-center justify-between px-2 py-1 border-b border-inherit cursor-grab"
              onMouseDown={(e) => handleMouseDown(e, note.id)}
            >
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide select-none">
                Note
              </span>
              <button
                type="button"
                className="text-gray-400 hover:text-destructive transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNote(note.id);
                }}
                title="Delete note"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <textarea
              className={`flex-1 ${c.bg} text-xs text-gray-800 p-2 resize-none border-none outline-none rounded-b-md`}
              value={note.text}
              placeholder="Type a note…"
              onChange={(e) => updateNote(note.id, { text: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        );
      })}
    </div>
  );
}
