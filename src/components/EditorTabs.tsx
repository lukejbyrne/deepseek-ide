import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import Editor from './Editor';
import { OpenFile } from '../App';
import Split from 'react-split';

interface EditorTabsProps {
  files: OpenFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileClose: (fileId: string) => void;
  onContentChange: (fileId: string, content: string) => void;
  onFileSave: (fileId: string) => void;
}

const EditorTabs: React.FC<EditorTabsProps> = ({
  files,
  activeFileId,
  onFileSelect,
  onFileClose,
  onContentChange,
  onFileSave,
}) => {
  const [splits, setSplits] = useState([activeFileId || '']);

  const handleSplitAdd = () => {
    if (activeFileId) {
      setSplits(prev => [...prev, activeFileId]);
    }
  };

  const handleSplitRemove = (index: number) => {
    setSplits(prev => prev.filter((_, i) => i !== index));
  };

  if (files.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-900">
        Open a file to start editing
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex bg-gray-800 border-b border-gray-700">
        <div className="flex overflow-x-auto">
          {files.map(file => (
            <div
              key={file.id}
              className={`flex items-center px-3 py-2 space-x-2 text-sm hover:bg-gray-700 cursor-pointer ${
                activeFileId === file.id ? 'bg-gray-700' : ''
              }`}
              onClick={() => onFileSelect(file.id)}
            >
              <span>
                {file.path.split('/').pop()}
                {file.isDirty && '*'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileClose(file.id);
                }}
                className="p-1 hover:bg-gray-600 rounded"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <Split
        className="flex-1"
        sizes={splits.map(() => 100 / splits.length)}
        gutterSize={4}
        gutterStyle={() => ({
          backgroundColor: '#4a5568',
        })}
      >
        {splits.map((splitFileId, index) => (
          <div key={index} className="relative h-full">
            {index > 0 && (
              <button
                onClick={() => handleSplitRemove(index)}
                className="absolute top-0 right-0 z-10 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded m-1"
              >
                ×
              </button>
            )}
            <Editor
              content={files.find(f => f.id === splitFileId)?.content || ''}
              language={files.find(f => f.id === splitFileId)?.language || 'typescript'}
              onChange={(value) => onContentChange(splitFileId, value || '')}
            />
          </div>
        ))}
      </Split>
    </div>
  );
};

export default EditorTabs;