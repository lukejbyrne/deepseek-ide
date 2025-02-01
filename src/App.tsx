import React, { useState, useEffect } from 'react';
import Split from 'react-split';
import { FolderOpen, Save } from 'lucide-react';
import FileExplorer from './components/FileExplorer';
import EditorTabs from './components/EditorTabs';
import AIChat from './components/AIChat';
import Terminal from './components/Terminal';

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  id: string;
}

export interface OpenFile {
  id: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
  lastSaved?: Date;
  handle?: FileSystemFileHandle;
}

declare global {
  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory';
    getFileHandle(name: string): Promise<FileSystemFileHandle>;
    getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>;
    values(): AsyncIterableIterator<FileSystemHandle>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file';
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
  }

  interface Window {
    showDirectoryPicker(options?: {
      mode?: 'read' | 'readwrite';
    }): Promise<FileSystemDirectoryHandle>;
  }
}

let nextFileId = 1;

const generateFileTree = (data: any, parentPath = ''): FileNode[] => {
  return data.map((item: any) => {
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;
    const node: FileNode = {
      name: item.name,
      type: item.type,
      id: item.type === 'file' ? String(nextFileId++) : path,
    };
    if (item.type === 'folder' && item.children) {
      node.children = generateFileTree(item.children, path);
    }
    return node;
  });
};

function App() {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [terminals, setTerminals] = useState([{ id: '1', key: Date.now() }]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(true);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileStructure, setFileStructure] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [activeFileId, openFiles.length]);

  const getFileContent = async (fileHandle: FileSystemFileHandle): Promise<string> => {
    const file = await fileHandle.getFile();
    return await file.text();
  };

  const readDirectoryStructure = async (
    dirHandle: FileSystemDirectoryHandle,
    path: string = ''
  ): Promise<FileNode[]> => {
    const entries: FileNode[] = [];
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      if (entry.kind === 'directory') {
        const children = await readDirectoryStructure(
          entry as FileSystemDirectoryHandle,
          entryPath
        );
        entries.push({
          name: entry.name,
          type: 'folder',
          children,
          id: entryPath,
        });
      } else {
        entries.push({
          name: entry.name,
          type: 'file',
          id: entryPath,
        });
      }
    }
    return entries.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const handleSelectFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support folder selection.');
      return;
    }
  
    try {
      setIsLoading(true);
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  
      setDirectoryHandle(handle);
  
      // ✅ Manually reconstruct the selected folder path
      const folderPath = handle.name; // This gives only the folder name, not the absolute path
  
      setSelectedFolder(folderPath);
  
      console.log(`📂 Selected Folder: ${folderPath}`);
  
      const structure = await readDirectoryStructure(handle);
      setFileStructure(structure);
    } catch (error) {
      console.error('❌ Error selecting folder:', error);
      alert('Failed to open folder.');
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleFileSelect = async (filePath: string) => {
    if (!directoryHandle || !selectedFolder) {
      alert('No folder selected!');
      return;
    }
  
    try {
      const pathParts = filePath.split('/');
      let currentHandle: FileSystemDirectoryHandle = directoryHandle;
      let fileHandle: FileSystemFileHandle | null = null;
  
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        if (i === pathParts.length - 1) {
          fileHandle = await currentHandle.getFileHandle(part);
        } else {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }
      }
  
      if (!fileHandle) {
        console.error('❌ Could not find file:', filePath);
        return;
      }
  
      const file = await fileHandle.getFile();
  
      // ✅ Use string concatenation instead of `path`
      const absolutePath = `${selectedFolder}/${filePath}`.replace(/\/+/g, '/'); 
  
      console.log(`📂 Opened file: ${absolutePath}`); // Debugging
  
      const content = await file.text();
      const fileId = `${absolutePath}-${Date.now()}`;
  
      const newFile: OpenFile = {
        id: fileId,
        path: absolutePath, // ✅ Use manually generated path
        content,
        language: filePath.endsWith('.tsx') || filePath.endsWith('.ts')
          ? 'typescript'
          : filePath.endsWith('.jsx') || filePath.endsWith('.js')
          ? 'javascript'
          : 'plaintext',
        isDirty: false,
        handle: fileHandle,
      };
  
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileId(fileId);
    } catch (error) {
      console.error('❌ Error reading file:', error);
    }
  };
      

  const handleFileClose = (fileId: string) => {
    const file = openFiles.find(f => f.id === fileId);
    if (file?.isDirty) {
      if (window.confirm('Save changes before closing?')) {
        handleFileSave(fileId);
      }
    }
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFileId === fileId) {
      setActiveFileId(openFiles.length > 1 ? openFiles[openFiles.length - 2]?.id || null : null);
    }
  };

  const handleFileSave = async (fileId: string) => {
    const file = openFiles.find(f => f.id === fileId);
    if (!file) {
      alert('File not found.');
      return;
    }
  
    console.log(`💾 Attempting to save file: ${file.path}`); // Debugging
  
    try {
      // Use Electron's file system API to save the file
      const result = await window.electronAPI.saveFile(file.path, file.content);
  
      if (result.success) {
        console.log('✅ File saved successfully at:', file.path);
        setOpenFiles(prev =>
          prev.map(f => f.id === fileId ? { ...f, isDirty: false, lastSaved: new Date() } : f)
        );
      } else {
        console.error('❌ Failed to save file:', result.error);
        alert('Failed to save file: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      alert('Failed to save file: ' + error);
    }
  };
  
  const handleFileContentChange = (fileId: string, newContent: string) => {
    setOpenFiles(prev => {
      const fileIndex = prev.findIndex(f => f.id === fileId);
      if (fileIndex === -1) return prev;
      const updatedFiles = [...prev];
      updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], content: newContent, isDirty: true };
      return updatedFiles;
    });
  };

  const addTerminal = () => {
    setTerminals(prev => [...prev, { id: String(prev.length + 1), key: Date.now() }]);
  };

  const removeTerminal = (id: string) => {
    if (terminals.length > 1) {
      setTerminals(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSelectFolder}
            className="flex items-center px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            disabled={isLoading}
          >
            <FolderOpen size={16} className="mr-2" />
            {isLoading ? 'Loading...' : selectedFolder || 'Open Folder'}
          </button>
          {activeFileId && (
            <button
              onClick={() => handleFileSave(activeFileId)}
              className="flex items-center px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              <Save size={16} className="mr-2" />
              Save
            </button>
          )}
        </div>
      </div>

      <Split
        className="flex flex-1 overflow-hidden"
        sizes={[25, 45, 30]}
        minSize={[150, 300, 250]}
        gutterSize={4}
        gutterStyle={() => ({
          backgroundColor: '#4a5568',
        })}
      >
        <FileExplorer
          files={fileStructure}
          onFileSelect={handleFileSelect}
          selectedFolder={selectedFolder}
          isLoading={isLoading}
        />

        <EditorTabs
          key={forceUpdate}
          files={openFiles}
          activeFileId={activeFileId}
          onFileSelect={setActiveFileId}
          onFileClose={handleFileClose}
          onContentChange={handleFileContentChange}
          onFileSave={handleFileSave}
        />

        <AIChat files={openFiles} />
      </Split>

      <Split
        className="h-[30vh] border-t border-gray-700 overflow-hidden"
        direction="horizontal"
        sizes={terminals.map(() => 100 / terminals.length)}
        gutterSize={4}
        gutterStyle={() => ({
          backgroundColor: '#4a5568',
        })}
      >
        {terminals.map(terminal => (
          <div key={terminal.key} className="relative h-full overflow-hidden">
            <Terminal key={terminal.key} />
            <div className="absolute top-0 right-0 p-1 flex gap-1">
              {terminals.length > 1 && (
                <button
                  onClick={() => removeTerminal(terminal.id)}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </Split>
    </div>
  );
}

export default App;