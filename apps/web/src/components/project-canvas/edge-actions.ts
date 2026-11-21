import { createContext } from "react";
import type { Point } from "./types";

/** Lets an edge's remove button reach the graph without threading callbacks through edge data. */
export const EdgeActions = createContext<{ remove: (id: string) => void }>({ remove: () => {} });

/** Every edge's orthogonal route (route.ts), computed once for the whole graph. */
export const EdgeRoutes = createContext<ReadonlyMap<string, Point[]>>(new Map());
