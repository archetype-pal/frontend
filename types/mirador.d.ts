declare module 'mirador' {
  export interface MiradorWindowConfig {
    manifestId: string;
  }

  export interface MiradorConfig {
    id: string;
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
  }

  const Mirador: {
    viewer(config: MiradorConfig, plugins?: unknown[]): MiradorInstance;
  };

  export default Mirador;
}
