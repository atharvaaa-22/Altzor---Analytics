import { create } from 'zustand';

interface SemanticStore {
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;
  isSyncing: boolean;
  setIsSyncing: (isSyncing: boolean) => void;
}

export const useSemanticStore = create<SemanticStore>((set) => ({
  selectedTableId: null,
  setSelectedTableId: (id): void => set({ selectedTableId: id }),
  isSyncing: false,
  setIsSyncing: (isSyncing): void => set({ isSyncing }),
}));
