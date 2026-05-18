import { describe, expect, it } from 'vitest';

import {
  a9sToBackendFeature,
  backendToA9sAnnotation,
  dbIdFromA9s,
  isDbAnnotation,
  polygonToXywh,
  xywhToPolygon,
} from './anno-mapping';
import type { Annotation } from '@/components/manuscript/manuscript-annotorious';
import type { BackendGraph } from '@/services/annotations';

function makeBackendGraph(overrides: Partial<BackendGraph> = {}): BackendGraph {
  return {
    id: 1,
    annotation: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [10, 90],
            [10, 80],
            [20, 80],
            [20, 90],
            [10, 90],
          ],
        ],
      },
      properties: { saved: 1 },
    },
    annotation_type: 'image',
    allograph: 5,
    hand: 7,
    positions: [],
    position_details: [],
    graphcomponent_set: [],
    ...overrides,
  } as BackendGraph;
}

describe('xywhToPolygon', () => {
  it('returns a closed ring (last point equals first)', () => {
    const rings = xywhToPolygon(10, 20, 30, 40);
    const ring = rings[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.length).toBe(5);
  });

  it('lays out the four corners clockwise from the top-left in image-coord space', () => {
    expect(xywhToPolygon(0, 0, 10, 20)).toEqual([
      [
        [0, 0],
        [0, 20],
        [10, 20],
        [10, 0],
        [0, 0],
      ],
    ]);
  });
});

describe('polygonToXywh', () => {
  it('extracts bounding box and Y-flips minY against image height', () => {
    // Polygon at backend Y-up coords: minX=10, minY=80, maxX=20, maxY=90 → w=10, h=10
    // imgHeight=100 → yFlipped = 100 - 80 - 10 = 10
    const result = polygonToXywh(
      [
        [
          [10, 90],
          [10, 80],
          [20, 80],
          [20, 90],
          [10, 90],
        ],
      ],
      100
    );
    expect(result).toEqual({ x: 10, y: 10, w: 10, h: 10 });
  });

  it('round-trips through xywhToPolygon when image height collapses (yFlipped = -minY when h cancels)', () => {
    // Sanity: with the same h, the y-flip is symmetric — feeding the output
    // through a9sToBackendFeature/backendToA9sAnnotation must round-trip
    // (covered explicitly below).
    const { x, y, w, h } = polygonToXywh(xywhToPolygon(5, 10, 15, 20), 100);
    expect({ x, w, h }).toEqual({ x: 5, w: 15, h: 20 });
    // y here is 100 - 10 - 20 = 70 (yFlipped of the polygon's minY)
    expect(y).toBe(70);
  });
});

describe('a9sToBackendFeature', () => {
  function makeA9s(value: string): Annotation {
    return {
      id: 'local-1',
      type: 'Annotation',
      target: { selector: { type: 'FragmentSelector', value } },
    } as Annotation;
  }

  it('parses an integer xywh fragment and Y-flips', () => {
    const feature = a9sToBackendFeature(makeA9s('xywh=pixel:10,10,15,20'), 100);
    expect(feature.geometry.type).toBe('Polygon');
    // x=10, y=10, w=15, h=20, height=100 → yFlipped = 100 - 10 - 20 = 70
    // Polygon corners use yFlipped as minY → ring spans y=70..90
    const ring = feature.geometry.coordinates[0];
    const ys = ring.map((p) => p[1]);
    expect(Math.min(...ys)).toBe(70);
    expect(Math.max(...ys)).toBe(90);
  });

  it('accepts decimal coordinates in the xywh fragment', () => {
    const feature = a9sToBackendFeature(makeA9s('xywh=pixel:10.5,12.25,8.75,4.5'), 100);
    const ring = feature.geometry.coordinates[0];
    const xs = ring.map((p) => p[0]);
    expect(Math.min(...xs)).toBeCloseTo(10.5);
    expect(Math.max(...xs)).toBeCloseTo(19.25);
  });

  it('throws when the selector has no xywh fragment', () => {
    expect(() => a9sToBackendFeature(makeA9s(''), 100)).toThrow(/xywh/);
    expect(() => a9sToBackendFeature(makeA9s('something-else'), 100)).toThrow(/xywh/);
  });

  it('throws when image height is zero or negative', () => {
    const a = makeA9s('xywh=pixel:1,1,1,1');
    expect(() => a9sToBackendFeature(a, 0)).toThrow(/image height/);
    expect(() => a9sToBackendFeature(a, -5)).toThrow(/image height/);
    expect(() => a9sToBackendFeature(a, Number.NaN)).toThrow(/image height/);
  });

  it('round-trips through backendToA9sAnnotation losslessly for integer coords', () => {
    const original = makeA9s('xywh=pixel:12,34,56,78');
    const feature = a9sToBackendFeature(original, 200);
    const backend = makeBackendGraph({ annotation: feature });
    const restored = backendToA9sAnnotation(backend, 200);
    expect(restored.target).toEqual({
      selector: {
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: 'xywh=pixel:12,34,56,78',
      },
    });
  });
});

describe('backendToA9sAnnotation', () => {
  it('emits a db: id prefix', () => {
    const result = backendToA9sAnnotation(makeBackendGraph({ id: 42 }), 100);
    expect(result.id).toBe('db:42');
  });

  it('emits an xywh FragmentSelector with the Y-flipped origin', () => {
    const result = backendToA9sAnnotation(makeBackendGraph(), 100);
    // Backend polygon spans backend-Y 80..90; height=100 → flipped y = 10
    expect(result.target).toEqual({
      selector: {
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: 'xywh=pixel:10,10,10,10',
      },
    });
  });

  it('attaches body for image-type graphs and omits it for editorial', () => {
    const imageResult = backendToA9sAnnotation(
      makeBackendGraph({ annotation_type: 'image' }),
      100,
      'alpha'
    );
    expect(imageResult.body).toBeDefined();

    const editorialResult = backendToA9sAnnotation(
      makeBackendGraph({ annotation_type: 'editorial' }),
      100
    );
    expect(editorialResult.body).toBeUndefined();
  });

  it('uses fallback num_features when not provided on the backend payload', () => {
    const result = backendToA9sAnnotation(
      makeBackendGraph({
        num_features: undefined,
        graphcomponent_set: [
          { component: 1, component_name: 'c1', features: [10, 11], feature_details: [] },
          { component: 2, component_name: 'c2', features: [12], feature_details: [] },
        ],
      }),
      100
    );
    expect(result._meta?.numFeatures).toBe(3);
    expect(result._meta?.isDescribed).toBe(true);
  });

  it('marks empty graph-component sets as not described', () => {
    const result = backendToA9sAnnotation(makeBackendGraph({ graphcomponent_set: [] }), 100);
    expect(result._meta?.numFeatures).toBe(0);
    expect(result._meta?.isDescribed).toBe(false);
  });
});

describe('isDbAnnotation / dbIdFromA9s', () => {
  function ann(id: string): Annotation {
    return { id, type: 'Annotation', target: {} } as Annotation;
  }

  it('isDbAnnotation matches the db: prefix only', () => {
    expect(isDbAnnotation(ann('db:5'))).toBe(true);
    expect(isDbAnnotation(ann('draft:5'))).toBe(false);
    expect(isDbAnnotation(ann('local-uuid'))).toBe(false);
  });

  it('dbIdFromA9s parses the numeric id', () => {
    expect(dbIdFromA9s(ann('db:42'))).toBe(42);
  });

  it('dbIdFromA9s returns null for non-db annotations', () => {
    expect(dbIdFromA9s(ann('local-uuid'))).toBeNull();
  });

  it('dbIdFromA9s returns null for db: without a parseable suffix', () => {
    expect(dbIdFromA9s(ann('db:'))).toBeNull();
    expect(dbIdFromA9s(ann('db:abc'))).toBeNull();
  });
});
