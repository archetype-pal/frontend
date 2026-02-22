import type { Annotation } from '@/components/manuscript/ManuscriptAnnotorious';
import type { BackendGraph } from '@/services/annotations';

// Convert rect (xywh) <-> Polygon for the backend.

// xywh = { x, y, w, h } in IMAGE PIXELS
export function xywhToPolygon(x: number, y: number, w: number, h: number) {
  const x1 = x,
    y1 = y;
  const x2 = x + w,
    y2 = y + h;
  // Closed ring: last equals first
  return [
    [
      [x1, y1],
      [x1, y2],
      [x2, y2],
      [x2, y1],
      [x1, y1],
    ],
  ];
}

export function polygonToXywh(coords: number[][][], imgHeight: number) {
  const ring = coords[0];
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = maxX - minX;
  const h = maxY - minY;

  // Flip Y coordinate system
  const yFlipped = imgHeight - minY - h;

  return { x: minX, y: yFlipped, w, h };
}

// Build a minimal W3C Web Annotation for Annotorious from polygon
export function backendToA9sAnnotation(
  backend: BackendGraph,
  imageHeight: number,
  allographLabel?: string
): Annotation {
  const { x, y, w, h } = polygonToXywh(backend.annotation.geometry.coordinates, imageHeight);
  const base: Annotation = {
    id: `db:${backend.id}`,
    type: 'Annotation',
    target: {
      selector: {
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: `xywh=pixel:${x},${y},${w},${h}`,
      },
    },
    _meta: {
      allographId: backend.allograph,
      handId: backend.hand,
    },
  };

  if (allographLabel) {
    base.body = [
      {
        type: 'TextualBody',
        purpose: 'commenting',
        value: allographLabel,
      },
    ];
  }

  return base;
}

// A minimal view of the target we care about
type FragmentTarget = {
  selector?: {
    value?: string;
  };
};

// Convenience alias for the backend annotation feature
export type BackendFeature = BackendGraph['annotation'];

// From a9s rect annotation (xywh) back to the backend polygon Feature
export function a9sToBackendFeature(a9s: Annotation): BackendFeature {
  const sel = (a9s.target as FragmentTarget)?.selector?.value ?? '';

  const m = sel.match(/xywh=pixel:(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/);
  if (!m) throw new Error('Annotation has no xywh FragmentSelector');
  const [, sx, sy, sw, sh] = m;
  const x = parseFloat(sx),
    y = parseFloat(sy),
    w = parseFloat(sw),
    h = parseFloat(sh);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: xywhToPolygon(x, y, w, h),
    },
    properties: { saved: 0 }, // keep the existing property if needed
  };
}

export function isDbAnnotation(a9s: Annotation): boolean {
  return typeof a9s?.id === 'string' && a9s.id.startsWith('db:');
}

export function dbIdFromA9s(a9s: Annotation): number | null {
  if (!isDbAnnotation(a9s)) return null;
  // return parseInt(a9s.id.split(':')[1], 10)
  const [, idStr] = (a9s.id as string).split(':');
  const idNum = Number.parseInt(idStr ?? '', 10);

  return Number.isNaN(idNum) ? null : idNum;
}
