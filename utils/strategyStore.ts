import React from 'react';
import { EvaluateInput, StrategyResult } from './api';

export type { StrategyResult, EvaluateInput };

export interface StrategyContextType {
  result: StrategyResult | null;
  setResult: (r: StrategyResult) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  lastInput: EvaluateInput | null;
  setLastInput: (i: EvaluateInput) => void;
}

export const StrategyContext = React.createContext<StrategyContextType>({
  result: null,
  setResult: () => {},
  isLoading: false,
  setIsLoading: () => {},
  lastInput: null,
  setLastInput: () => {},
});

export function StrategyProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = React.useState<StrategyResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastInput, setLastInput] = React.useState<EvaluateInput | null>(null);

  const value = React.useMemo<StrategyContextType>(
    () => ({ result, setResult, isLoading, setIsLoading, lastInput, setLastInput }),
    [result, isLoading, lastInput]
  );

  return React.createElement(StrategyContext.Provider, { value }, children);
}
