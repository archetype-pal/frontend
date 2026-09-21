declare module 'mirador' {
  export interface MiradorWindowConfig {
    manifestId: string;
  }

  export interface MiradorConfig {
    id: string;
    /** UI language (a key of Mirador's bundled locales, e.g. 'en' | 'fr' | 'de'). */
    language?: string;
    windows: MiradorWindowConfig[];
    workspace?: { type?: string; showZoomControls?: boolean };
    window?: {
      allowClose?: boolean;
      allowMaximize?: boolean;
      sideBarOpenByDefault?: boolean;
      defaultSideBarPanel?: string;
    };
  }

  export interface MiradorInstance {
    store: unknown;
    /** Unmounts Mirador's React root from the container (see src/lib/MiradorViewer.jsx). */
    unmount(): void;
  }

  const Mirador: {
    viewer(config: MiradorConfig, plugins?: unknown[]): MiradorInstance;
  };

  export default Mirador;
}
