import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const THEME = {
  background: "#0e0e10",
  foreground: "#e4e4e7",
  cursor: "#f97316",
  cursorAccent: "#0e0e10",
  selectionBackground: "#f9731644",
  black: "#18181b",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  magenta: "#a855f7",
  cyan: "#06b6d4",
  white: "#e4e4e7",
  brightBlack: "#3f3f46",
  brightRed: "#f87171",
  brightGreen: "#4ade80",
  brightYellow: "#facc15",
  brightBlue: "#60a5fa",
  brightMagenta: "#c084fc",
  brightCyan: "#22d3ee",
  brightWhite: "#fafafa",
};

export const XTerminal = forwardRef(function XTerminal({ terminalId, wsRef, onReady }, ref) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);

  useImperativeHandle(ref, () => ({
    fit: () => fitRef.current?.fit(),
    focus: () => termRef.current?.focus(),
    write: (data) => termRef.current?.write(data),
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: THEME,
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      allowProposedApi: true,
      scrollback: 10000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    // Small delay to let the container settle, then fit
    requestAnimationFrame(() => {
      fit.fit();
    });

    termRef.current = term;
    fitRef.current = fit;

    // Send keystrokes to server
    term.onData((data) => {
      const ws = wsRef?.current;
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: "TERMINAL_INPUT",
          payload: { terminalId, data },
        }));
      }
    });

    // Resize handling
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fit.fit();
        const ws = wsRef?.current;
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({
            type: "TERMINAL_RESIZE",
            payload: { terminalId, cols: term.cols, rows: term.rows },
          }));
        }
      });
    });
    resizeObserver.observe(containerRef.current);

    // Attach to terminal on server
    const ws = wsRef?.current;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: "TERMINAL_ATTACH",
        payload: { terminalId },
      }));
    }

    onReady?.();

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      // Detach
      const ws2 = wsRef?.current;
      if (ws2 && ws2.readyState === 1) {
        ws2.send(JSON.stringify({
          type: "TERMINAL_DETACH",
          payload: { terminalId },
        }));
      }
    };
  }, [terminalId]);

  // Listen for terminal output from WebSocket
  useEffect(() => {
    function handleWsMessage(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "TERMINAL_OUTPUT" && msg.terminalId === terminalId) {
          termRef.current?.write(msg.data);
        }
        if (msg.type === "TERMINAL_EXIT" && msg.terminalId === terminalId) {
          termRef.current?.write(`\r\n\x1b[90m[Process exited with code ${msg.exitCode}]\x1b[0m\r\n`);
        }
      } catch {}
    }

    const ws = wsRef?.current;
    if (ws) {
      ws.addEventListener("message", handleWsMessage);
      return () => ws.removeEventListener("message", handleWsMessage);
    }
  }, [terminalId, wsRef?.current]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ padding: "4px 0 0 4px" }}
    />
  );
});
