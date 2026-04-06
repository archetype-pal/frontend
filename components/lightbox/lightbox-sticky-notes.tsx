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

// Debounce timer for text input persistence
let textPersistTimer: ReturnType<typeof setTimeout> | null = null;

interface LightboxStickyNotesProps {
  workspaceId: string;
}

export function LightboxStickyNotes({ workspaceId }: LightboxStickyNotesProps) {
  const [notes, setNotes] = React.useState<LightboxStickyNote[]>([]);
  const noteRefsMap = React.useRef(new Map<string, HTMLDivElement>());

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

  const updateNoteText = React.useCallback((id: string, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text, updatedAt: Date.now() } : n)));
    // Debounce DB persist for text input
    if (textPersistTimer) clearTimeout(textPersistTimer);
    textPersistTimer = setTimeout(() => {
      setNotes((current) => {
        const note = current.find((n) => n.id === id);
        if (note) saveStickyNote({ ...note, updatedAt: Date.now() });
        return current;
      });
    }, 500);
  }, []);

  const removeNote = async (id: string) => {
    noteRefsMap.current.delete(id);
    await deleteStickyNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Ref-based drag: DOM mutation during mousemove, commit to state on mouseup
  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const noteEl = noteRefsMap.current.get(noteId);
    if (!noteEl) return;
    const rect = noteEl.getBoundingClientRect();
    const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    noteEl.style.cursor = 'grabbing';

    let finalX = 0;
    let finalY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.lightbox-container');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      finalX = Math.max(0, e.clientX - containerRect.left - offset.x);
      finalY = Math.max(0, e.clientY - containerRect.top - offset.y);
      // Direct DOM mutation — no React re-render
      noteEl.style.left = `${finalX}px`;
      noteEl.style.top = `${finalY}px`;
    };

    const handleMouseUp = () => {
      noteEl.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Commit final position to React state + persist
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, position: { x: finalX, y: finalY }, updatedAt: Date.now() } : n
        )
      );
      setNotes((current) => {
        const note = current.find((n) => n.id === noteId);
        if (note) saveStickyNote({ ...note, updatedAt: Date.now() });
        return current;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
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
            ref={(el) => {
              if (el) noteRefsMap.current.set(note.id, el);
            }}
            className={`absolute pointer-events-auto ${c.bg} ${c.border} border rounded-md shadow-md flex flex-col`}
            style={{
              left: `${note.position.x}px`,
              top: `${note.position.y}px`,
              width: `${note.size.width}px`,
              minHeight: `${note.size.height}px`,
              zIndex: 1000,
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
              onChange={(e) => updateNoteText(note.id, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        );
      })}
    </div>
  );
}
