import { useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ChecklistItem, RecurrenceType } from '../types';

export function isDueOnDate(item: ChecklistItem, date: Date): boolean {
  const day = date.getDay(); // 0=Sun, 6=Sat
  const startDate = new Date(item.startDate);

  switch (item.recurrence) {
    case 'once': {
      const sd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return sd.getTime() === d.getTime();
    }
    case 'daily':
      return true;
    case 'weekdays':
      return day >= 1 && day <= 5;
    case 'weekends':
      return day === 0 || day === 6;
    case 'specific-days':
      return item.specificDays?.includes(day) ?? false;
    case 'every-n-days': {
      if (!item.everyNDays || item.everyNDays <= 0) return false;
      const diffMs = date.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % item.everyNDays === 0;
    }
    default:
      return false;
  }
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useChecklist() {
  const { state, dispatch } = useAppContext();

  const addItem = useCallback(
    (item: Omit<ChecklistItem, 'id' | 'createdAt' | 'startDate'> & { startDate?: string }) => {
      const now = new Date().toISOString();
      const newItem: ChecklistItem = {
        ...item,
        id: `checklist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        startDate: item.startDate ?? formatDate(new Date()),
        createdAt: now,
      };
      dispatch({ type: 'ADD_CHECKLIST_ITEM', payload: newItem });
      return newItem;
    },
    [dispatch]
  );

  const updateItem = useCallback(
    (item: ChecklistItem) => {
      dispatch({ type: 'UPDATE_CHECKLIST_ITEM', payload: item });
    },
    [dispatch]
  );

  const deleteItem = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_CHECKLIST_ITEM', payload: id });
    },
    [dispatch]
  );

  const toggleCompletion = useCallback(
    (itemId: string, date: Date) => {
      dispatch({
        type: 'TOGGLE_CHECKLIST_COMPLETION',
        payload: { itemId, date: formatDate(date) },
      });
    },
    [dispatch]
  );

  const getItemsForDate = useCallback(
    (date: Date) => {
      return state.checklistItems.filter((item) => isDueOnDate(item, date));
    },
    [state.checklistItems]
  );

  const isCompleted = useCallback(
    (itemId: string, date: Date) => {
      const dateStr = formatDate(date);
      return state.checklistCompletions.some(
        (c) => c.itemId === itemId && c.date === dateStr
      );
    },
    [state.checklistCompletions]
  );

  return {
    items: state.checklistItems,
    completions: state.checklistCompletions,
    addItem,
    updateItem,
    deleteItem,
    toggleCompletion,
    getItemsForDate,
    isCompleted,
  };
}
