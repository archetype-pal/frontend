'use client';

import * as React from 'react';
import CodeMirror, { type ReactCodeMirrorProps } from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';

interface TeiCodeMirrorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * Handed the live `EditorView` on mount (roadmap 4.3) — lets a caller read the
   * cursor/selection and dispatch inserts (e.g. the msDesc reference picker).
   * Optional and backward-compatible: the charter TEI editor omits it.
   */
  onCreateEditor?: ReactCodeMirrorProps['onCreateEditor'];
}

/**
 * CodeMirror 6 XML editor for TEI source (Phase H.8). Client-only — imported
 * via next/dynamic with `ssr: false` from the TEI editor.
 */
export default function TeiCodeMirror({
  value,
  onChange,
  placeholder,
  onCreateEditor,
}: TeiCodeMirrorProps) {
  const isDark =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      onCreateEditor={onCreateEditor}
      placeholder={placeholder}
      theme={isDark ? 'dark' : 'light'}
      extensions={[xml()]}
      minHeight="320px"
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
      }}
      className="text-xs"
    />
  );
}
