import { createContext, useContext } from "react";

export interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

/** Returns the ids/aria state of the enclosing `Field`, or null outside one. */
export function useFieldControl() {
  return useContext(FieldContext);
}
