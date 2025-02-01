import React from 'react';
import MonacoEditor from '@monaco-editor/react';

interface EditorProps { 
  content: string; 
  language: string;
  onChange: (value: string | undefined) => void;
}

const Editor: React.FC<EditorProps> = ({ content, language, onChange }) => {
  return (
    <div className="w-full h-full min-h-[200px]">
      <MonacoEditor
        height="100%"
        language={language}
        value={content}
        onChange={onChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default Editor;