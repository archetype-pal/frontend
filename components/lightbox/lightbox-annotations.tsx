'use client';

import * as React from 'react';
import { Square, Pencil, Trash2, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LightboxImage, LightboxAnnotation, AnnotationShape } from '@/lib/lightbox-db';
import { saveAnnotation, getImageAnnotations, deleteAnnotation } from '@/lib/lightbox-db';

type DrawMode = 'select' | 'rect' | 'freehand';

const ANNOTATION_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
];

function generateId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface LightboxAnnotationsProps {
  image: LightboxImage;
}

export function LightboxAnnotations({ image }: LightboxAnnotationsProps) {
  const [annotations, setAnnotations] = React.useState<LightboxAnnotation[]>([]);
  const [mode, setMode] = React.useState<DrawMode>('select');
  const [color, setColor] = React.useState(ANNOTATION_COLORS[0]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editLabel, setEditLabel] = React.useState('');

  // Drawing state
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawStart, setDrawStart] = React.useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = React.useState<{ x: number; y: number } | null>(null);
  const [freehandPoints, setFreehandPoints] = React.useState<{ x: number; y: number }[]>([]);
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Load annotations on mount and when image changes
  React.useEffect(() => {
    let cancelled = false;
    getImageAnnotations(image.id).then((loaded) => {
      if (!cancelled) setAnnotations(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [image.id]);

  const getSvgPoint = (e: React.MouseEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePointerDown = (e: React.MouseEvent) => {
    if (mode === 'select') return;
    const pt = getSvgPoint(e);
    if (!pt) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDrawing(true);
    setDrawStart(pt);
    setDrawCurrent(pt);
    if (mode === 'freehand') {
      setFreehandPoints([pt]);
    }
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pt = getSvgPoint(e);
    if (!pt) return;
    e.preventDefault();
    setDrawCurrent(pt);
    if (mode === 'freehand') {
      setFreehandPoints((prev) => [...prev, pt]);
    }
  };

  const handlePointerUp = async (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDrawing(false);

    let shape: AnnotationShape | null = null;

    if (mode === 'rect' && drawCurrent) {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);
      if (width > 0.5 && height > 0.5) {
        shape = { type: 'rect', x, y, width, height };
      }
    } else if (mode === 'freehand' && freehandPoints.length > 2) {
      shape = { type: 'freehand', points: freehandPoints };
    }

    if (shape) {
      const now = Date.now();
      const ann: LightboxAnnotation = {
        id: generateId(),
        imageId: image.id,
        shape,
        label: '',
        color,
        createdAt: now,
        updatedAt: now,
      };
      await saveAnnotation(ann);
      setAnnotations((prev) => [...prev, ann]);
      setSelectedId(ann.id);
      setEditLabel('');
      setMode('select');
    }

    setDrawStart(null);
    setDrawCurrent(null);
    setFreehandPoints([]);
  };

  const handleAnnotationClick = (e: React.MouseEvent, annId: string) => {
    e.stopPropagation();
    if (mode !== 'select') return;
    const ann = annotations.find((a) => a.id === annId);
    setSelectedId(annId);
    setEditLabel(ann?.label ?? '');
  };

  const handleSvgClick = () => {
    if (mode === 'select') {
      setSelectedId(null);
    }
  };

  const handleLabelSave = async () => {
    if (!selectedId) return;
    const ann = annotations.find((a) => a.id === selectedId);
    if (!ann) return;
    const updated = { ...ann, label: editLabel, updatedAt: Date.now() };
    await saveAnnotation(updated);
    setAnnotations((prev) => prev.map((a) => (a.id === selectedId ? updated : a)));
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    await deleteAnnotation(selectedId);
    setAnnotations((prev) => prev.filter((a) => a.id !== selectedId));
    setSelectedId(null);
  };

  const renderShape = (ann: LightboxAnnotation, isSelected: boolean) => {
    const { shape } = ann;
    if (!shape) return null;
    const strokeWidth = isSelected ? 0.4 : 0.25;

    if (shape.type === 'rect') {
      return (
        <g
          key={ann.id}
          onClick={(e) => handleAnnotationClick(e, ann.id)}
          className="cursor-pointer"
        >
          <rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill={`${ann.color}20`}
            stroke={ann.color}
            strokeWidth={strokeWidth}
            strokeDasharray={isSelected ? '0.8 0.4' : undefined}
          />
          {ann.label && (
            <text
              x={shape.x + 0.5}
              y={shape.y - 0.5}
              fontSize="2.5"
              fill={ann.color}
              fontWeight="600"
            >
              {ann.label}
            </text>
          )}
        </g>
      );
    }

    if (shape.type === 'freehand') {
      const d = shape.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      return (
        <g
          key={ann.id}
          onClick={(e) => handleAnnotationClick(e, ann.id)}
          className="cursor-pointer"
        >
          <path
            d={d}
            fill="none"
            stroke={ann.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isSelected ? '0.8 0.4' : undefined}
          />
          {ann.label && shape.points.length > 0 && (
            <text
              x={shape.points[0].x}
              y={shape.points[0].y - 1}
              fontSize="2.5"
              fill={ann.color}
              fontWeight="600"
            >
              {ann.label}
            </text>
          )}
        </g>
      );
    }

    return null;
  };

  // Preview shape while drawing
  const renderPreview = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return null;

    if (mode === 'rect') {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={`${color}15`}
          stroke={color}
          strokeWidth={0.25}
          strokeDasharray="0.6 0.3"
        />
      );
    }

    if (mode === 'freehand' && freehandPoints.length > 1) {
      const d = freehandPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      return (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={0.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="0.6 0.3"
        />
      );
    }

    return null;
  };

  const selectedAnnotation = annotations.find((a) => a.id === selectedId);

  return (
    <div className="relative w-full h-full">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border px-2 py-1">
        <Button
          variant={mode === 'select' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setMode('select')}
          title="Select"
        >
          <MousePointer className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={mode === 'rect' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setMode('rect')}
          title="Draw rectangle"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={mode === 'freehand' ? 'default' : 'ghost'}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setMode('freehand')}
          title="Freehand draw"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Color picker */}
        <div className="flex items-center gap-0.5">
          {ANNOTATION_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`w-4 h-4 rounded-full border-2 transition-transform ${
                color === c ? 'border-gray-800 scale-125' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <span className="text-[10px] text-muted-foreground tabular-nums">{annotations.length}</span>
      </div>

      {/* Selected annotation details */}
      {selectedAnnotation && mode === 'select' && (
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border px-3 py-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: selectedAnnotation.color }}
          />
          <Input
            className="h-7 text-xs w-40"
            placeholder="Add label…"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLabelSave();
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={handleDelete}
            title="Delete annotation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* SVG overlay */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          cursor: mode === 'rect' ? 'crosshair' : mode === 'freehand' ? 'crosshair' : 'default',
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onClick={handleSvgClick}
      >
        {annotations.map((ann) => renderShape(ann, ann.id === selectedId))}
        {renderPreview()}
      </svg>
    </div>
  );
}
