import { createContext, useContext } from "react";

/** Callbacks injected into canvas nodes via context (avoid threading through React Flow node data). */
export interface CanvasActions {
  /** Open rename dialog for a locally-added service. */
  onRenameService: (id: string, currentName: string) => void;
  /** Immediately remove a locally-added service and its edges. */
  onRemoveService: (id: string) => void;
  /** Immediately remove a domain. */
  onRemoveDomain: (id: string) => void;
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null);

export function useCanvasActions(): CanvasActions | null {
  return useContext(CanvasActionsContext);
}
