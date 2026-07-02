import Editor from '@monaco-editor/react';

export function SqlEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="w-full h-full overflow-hidden bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage="sql"
        theme="vs-dark"
        value={value}
        onChange={(val) => onChange(val || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}
