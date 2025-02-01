import React from 'react'; 
import { Folder, File, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { FileNode } from '../App';  // Import the FileNode type from App.tsx

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (path: string) => void;
  selectedFolder: string | null;
  isLoading: boolean;
}

const FileTreeNode: React.FC<{
  node: FileNode;
  level: number;
  path: string;
  onSelect: (path: string) => void;
}> = ({ node, level, path, onSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelect(path);
    }
  };

  return (
    <div className="select-none">
      <div
        className="flex items-center hover:bg-gray-700 px-2 py-1 cursor-pointer"
        style={{ paddingLeft: `${level * 12}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' && (
          <span className="mr-1">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        {node.type === 'folder' ? (
          <Folder size={14} className="mr-1" />
        ) : (
          <File size={14} className="mr-1" />
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {node.type === 'folder' && isOpen && node.children?.map((child, index) => (
        <FileTreeNode
          key={index}
          node={child}
          level={level + 1}
          path={`${path}/${child.name}`}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  selectedFolder,
  isLoading
}) => {
  return (
    <div className="h-full max-h-[100vh] bg-gray-800 text-gray-300 flex flex-col overflow-y-auto">
      <div className="p-2 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {selectedFolder ? selectedFolder.split('/').pop() : 'No Folder Selected'}
        </h2>
        {isLoading && <Loader2 size={14} className="animate-spin" />}
      </div>
      <div className="flex-1 overflow-auto p-2">
        {files.map((file, index) => (
          <FileTreeNode
            key={index}
            node={file}
            level={0}
            path={file.name}
            onSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;