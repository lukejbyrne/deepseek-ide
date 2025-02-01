import React, { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const inputRef = useRef<string>("");

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: "#1a1b26",
        foreground: "#a9b1d6",
        cursor: "#c0caf5",
      },
      fontFamily: 'Courier, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddon.fit();

    term.open(terminalRef.current);
    term.write("$ ");

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle terminal resizing
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      term.scrollToBottom(); // Scroll to the bottom after resizing
    });

    resizeObserver.observe(terminalRef.current);     

    term.onKey(({ key, domEvent }) => {
      if (domEvent.key === "Enter") {
        const commandToExecute = inputRef.current.trim();
        inputRef.current = ""; // Clear input immediately
        term.writeln(""); // Move to the next line after pressing Enter
        handleCommandExecution(commandToExecute);
        term.scrollToBottom(); // Scroll to the bottom after executing the command
      } else if (domEvent.key === "Backspace") {
        inputRef.current = inputRef.current.slice(0, -1);
        term.write("\x1b[D \x1b[D");
      } else if (domEvent.key === "ArrowUp") {
        if (historyIndex < commandHistory.length - 1) {
          setHistoryIndex(prev => prev + 1);
          inputRef.current = commandHistory[commandHistory.length - 1 - historyIndex];
          term.write("\x1b[2K\r$ " + inputRef.current.padEnd(term.cols));          // Clear the line and write the history command
          term.scrollToBottom(); // Scroll to the bottom after navigating history
        }
      } else if (domEvent.key === "ArrowDown") {
        if (historyIndex > 0) {
          setHistoryIndex(prev => prev - 1);
          inputRef.current = commandHistory[commandHistory.length - 1 - historyIndex];
          term.write("\x1b[2K\r$ " + inputRef.current.padEnd(term.cols));          // Clear the line and write the history command
          term.scrollToBottom(); // Scroll to the bottom after navigating history
        } else {
          setHistoryIndex(-1);
          inputRef.current = "";
          term.write("\x1b[2K\r$ "); // Clear the line and reset the prompt
          term.scrollToBottom(); // Scroll to the bottom after resetting the prompt
        }
      } else if (domEvent.key.length === 1) {
        inputRef.current += key;
        if (inputRef.current.length < term.cols - 2) {
          term.write(key);
        }      
      }
    });

    return () => {
      term.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  const handleCommandExecution = async (command: string) => {
    if (!command.trim()) {
      xtermRef.current?.writeln(""); // Just move to the next line if the command is empty
      xtermRef.current?.write("$ ");
      xtermRef.current?.scrollToBottom();
      return;
    }
  
    // Add the command to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
  
    // Handle "clear" command separately
    if (command === "clear") {
      xtermRef.current?.clear();
      xtermRef.current?.write("$ ");
      xtermRef.current?.scrollToBottom();
      return;
    }
  
    try {
      // ✅ Use `electronAPI.invoke` instead of `electron.invoke`
      const result = await window.electronAPI.invoke("terminal-command", command);
      xtermRef.current?.writeln(result);
    } catch (error) {
      xtermRef.current?.writeln(`Error: ${error}`);
    }
  
    // Write the new prompt
    xtermRef.current?.write("$ ");
    xtermRef.current?.scrollToBottom();
  };
  

  return (
    <div className="h-full bg-[#1a1b26]">
      <div ref={terminalRef} className="h-full w-full overflow-hidden" />
    </div>
  );
};

export default Terminal;