import React from "react";
import ReactDOM from "react-dom/client";
import Board from "./pages/Board";
import QuickPaste from "./pages/QuickPaste";
import "./index.css";

// Route by window label (Tauri sets the label in URL hash for dev, or we detect by path)
// quick-paste window loads at /quick-paste
const isQuickPaste = window.location.pathname === '/quick-paste' ||
  window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label === 'quick-paste';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isQuickPaste ? <QuickPaste /> : <Board />}
  </React.StrictMode>,
);

// Declare global Tauri internals type
declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      metadata?: {
        currentWindow?: {
          label?: string;
        };
      };
    };
  }
}
