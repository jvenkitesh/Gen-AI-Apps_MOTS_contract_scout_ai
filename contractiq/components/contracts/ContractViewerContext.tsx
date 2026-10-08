"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ContractViewerState {
  targetPage: number | null;
  setTargetPage: (page: number) => void;
}

const ContractViewerContext = createContext<ContractViewerState | null>(null);

export function ContractViewerProvider({ children }: { children: ReactNode }) {
  const [targetPage, setTargetPage] = useState<number | null>(null);
  return (
    <ContractViewerContext.Provider value={{ targetPage, setTargetPage }}>
      {children}
    </ContractViewerContext.Provider>
  );
}

export function useContractViewer(): ContractViewerState {
  const ctx = useContext(ContractViewerContext);
  if (!ctx) throw new Error("useContractViewer must be used within a ContractViewerProvider");
  return ctx;
}
