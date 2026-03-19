declare module '@recogito/annotorious-openseadragon' {
  export interface AnnotoriousBody {
    value: string;
    type?: string;
    purpose?: string;
  }

  export interface AnnotoriousMeta {
    allographId?: number;
    handId?: number;
    numFeatures?: number;
    isDescribed?: boolean;
    annotationType?: string;
    graphcomponentSet?: Array<{ component: number; features: number[] }>;
    positions?: number[];
  }

  export interface AnnotoriousAnnotation {
    id: string;
    type: 'Annotation';
    body?: AnnotoriousBody[];
    target: unknown;
    _meta?: AnnotoriousMeta;
  }

  export interface AnnotoriousConfig {
    widgets?: Array<{ widget: string }>;
    disableEditor?: boolean;
    readOnly?: boolean;
  }

  export interface AnnotoriousInstance {
    addAnnotation(annotation: AnnotoriousAnnotation): void;
    removeAnnotation(annotation: AnnotoriousAnnotation): void;
    getAnnotations(): AnnotoriousAnnotation[];
    getAnnotationById(id: string): AnnotoriousAnnotation | undefined;
    getSelected(): AnnotoriousAnnotation | undefined;
    selectAnnotation(
      annotationOrId: AnnotoriousAnnotation | string
    ): AnnotoriousAnnotation | undefined;
    setAnnotations(annotations: AnnotoriousAnnotation[]): void;
    fitBounds(
      annotationOrId: AnnotoriousAnnotation | string,
      options?: boolean | { immediately?: boolean; padding?: number }
    ): void;

    panTo(annotationOrId: AnnotoriousAnnotation | string, immediately?: boolean): void;
    updateSelected(
      annotation: AnnotoriousAnnotation,
      saveImmediately?: boolean
    ): Promise<void> | void;
    saveSelected(): Promise<void> | void;
    cancelSelected(): void | Promise<void>;
    setDrawingEnabled(enabled: boolean): void;
    setVisible(visible: boolean): void;

    on(event: 'createAnnotation', handler: (annotation: AnnotoriousAnnotation) => void): void;
    on(event: 'deleteAnnotation', handler: (annotation: AnnotoriousAnnotation) => void): void;
    on(
      event: 'selectAnnotation',
      handler: (annotation: AnnotoriousAnnotation | null, element?: unknown) => void
    ): void;
    on(event: 'createSelection', handler: (selection: AnnotoriousAnnotation) => void): void;
    on(event: 'cancelSelected', handler: () => void): void;
    on(
      event: 'updateAnnotation',
      handler: (annotation: AnnotoriousAnnotation, previous: AnnotoriousAnnotation) => void
    ): void;
    on(
      event: 'clickAnnotation',
      handler: (annotation: AnnotoriousAnnotation, event?: PointerEvent) => void
    ): void;
    on(event: string, handler: (...args: unknown[]) => void): void;

    off(event: 'createAnnotation', handler: (annotation: AnnotoriousAnnotation) => void): void;
    off(event: 'deleteAnnotation', handler: (annotation: AnnotoriousAnnotation) => void): void;
    off(
      event: 'selectAnnotation',
      handler: (annotation: AnnotoriousAnnotation | null, element?: unknown) => void
    ): void;
    off(event: 'createSelection', handler: (selection: AnnotoriousAnnotation) => void): void;
    off(event: 'cancelSelected', handler: () => void): void;
    off(
      event: 'updateAnnotation',
      handler: (annotation: AnnotoriousAnnotation, previous: AnnotoriousAnnotation) => void
    ): void;
    off(
      event: 'clickAnnotation',
      handler: (annotation: AnnotoriousAnnotation, event?: PointerEvent) => void
    ): void;
    off(event: string, handler: (...args: unknown[]) => void): void;

    destroy?(): void;

    disableEditor?: boolean;
    disableSelect?: boolean;
    readOnly?: boolean;
    widgets?: Array<{ widget: string }>;
  }

  export default function Annotorious(
    viewer: unknown,
    config?: AnnotoriousConfig
  ): AnnotoriousInstance;
}
