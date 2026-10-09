import { createContext, useContext } from 'react';
import type { Action, Demo } from './model';
export const Context = createContext<{
  state: Demo;
  send: (action: Action) => boolean;
  reset: () => boolean;
  error: string;
  clearError: () => void;
} | null>(null);
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error('DemoProvider missing');
  return value;
}
