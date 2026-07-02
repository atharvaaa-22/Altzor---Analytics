import { create } from 'zustand';
import type { UploadTask } from '../types';

interface UploadStore {
  queue: UploadTask[];
  addTask: (task: UploadTask) => void;
  updateTaskProgress: (id: string, progress: number) => void;
  updateTaskStatus: (id: string, status: UploadTask['status'], error?: string) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  queue: [],
  addTask: (task) => set((state) => ({ queue: [...state.queue, task] })),
  updateTaskProgress: (id, progress) =>
    set((state) => ({
      queue: state.queue.map((task) =>
        task.id === id ? { ...task, progress } : task
      ),
    })),
  updateTaskStatus: (id, status, error) =>
    set((state) => ({
      queue: state.queue.map((task) =>
        task.id === id ? { ...task, status, error } : task
      ),
    })),
  removeTask: (id) =>
    set((state) => ({ queue: state.queue.filter((task) => task.id !== id) })),
  clearCompleted: () =>
    set((state) => ({ queue: state.queue.filter((task) => task.status !== 'completed') })),
}));
