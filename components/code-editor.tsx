'use client';

import { useEffect, useRef } from 'react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });

if (typeof self !== 'undefined') {
  (
    self as typeof self & {
      MonacoEnvironment?: {
        getWorker: (_moduleId: string, label: string) => Worker;
      };
    }
  ).MonacoEnvironment = {
    getWorker(_moduleId, label) {
      const workerUrl =
        label === 'typescript' || label === 'javascript'
          ? '/monaco-ts-worker.js'
          : '/monaco-editor-worker.js';
      return new Worker(workerUrl);
    },
  };
}

const LANGUAGE_IDS: Record<string, string> = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  Java: 'java',
  'C++': 'cpp',
  Go: 'go',
  Rust: 'rust',
  SQL: 'sql',
};

export function CodeEditor({
  language,
  value,
  onChange,
  onSave,
}: {
  language: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const completionProvider = useRef<monaco.IDisposable | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const latestSave = useRef(onSave);
  latestSave.current = onSave;

  useEffect(() => {
    completionProvider.current?.dispose();
    completionProvider.current =
      monaco.languages.registerCompletionItemProvider(
        LANGUAGE_IDS[language] ?? 'javascript',
        {
          triggerCharacters: ['.', '_'],
          provideCompletionItems(model, position) {
            if (model !== editorRef.current?.getModel())
              return { suggestions: [] };
            const word = model.getWordUntilPosition(position);
            const identifiers = new Set(
              model.getValue().match(/[A-Za-z_$][\w$]*/g) ?? [],
            );
            return {
              suggestions: [...identifiers].map((label) => ({
                label,
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: label,
                range: new monaco.Range(
                  position.lineNumber,
                  word.startColumn,
                  position.lineNumber,
                  word.endColumn,
                ),
                sortText: `0_${label}`,
              })),
            };
          },
        },
      );
    return () => completionProvider.current?.dispose();
  }, [language]);

  const handleMount: OnMount = (editor, monacoApi) => {
    editorRef.current = editor;
    editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyS, () =>
      latestSave.current(),
    );
    editor.focus();
  };

  return (
    <div className="code-editor-shell">
      <Editor
        height="360px"
        language={LANGUAGE_IDS[language] ?? 'javascript'}
        value={value}
        onChange={(next) => onChange(next ?? '')}
        onMount={handleMount}
        theme="vs-dark"
        loading={<div className="editor-loading">正在加载代码编辑器…</div>}
        options={{
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoIndent: 'full',
          tabCompletion: 'on',
          accessibilitySupport: 'auto',
          autoSurround: 'languageDefined',
          bracketPairColorization: { enabled: true },
          quickSuggestions: { other: true, comments: false, strings: true },
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: 'currentDocument',
          acceptSuggestionOnEnter: 'on',
          snippetSuggestions: 'top',
          formatOnPaste: true,
          formatOnType: true,
          linkedEditing: true,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on',
          minimap: { enabled: false },
          fontFamily: 'Cascadia Code, JetBrains Mono, Consolas, monospace',
          fontSize: 14,
          lineHeight: 22,
          padding: { top: 14, bottom: 14 },
          scrollBeyondLastLine: false,
          overviewRulerBorder: false,
        }}
      />
    </div>
  );
}
