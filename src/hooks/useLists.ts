import { useCallback } from 'react';
import { useToolConfig } from './useToolConfig';
import { useChecklist } from './useChecklist';
import { useAppContext } from '../context/AppContext';
import { ListsConfig, List, ListItem } from '../types';

const DEFAULT_CONFIG: ListsConfig = { toolId: 'lists', lists: [] };

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useLists() {
  const { config, setConfig } = useToolConfig<ListsConfig>('lists');
  const { addItem: addChecklistItem, toggleCompletion, isCompleted } = useChecklist();
  const { state } = useAppContext();

  const lists = config?.lists ?? [];

  const saveConfig = useCallback(
    (updated: List[]) => {
      setConfig({ toolId: 'lists', lists: updated });
    },
    [setConfig]
  );

  const addList = useCallback(
    (title: string): List => {
      const newList: List = {
        id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: title.trim(),
        items: [],
        createdAt: new Date().toISOString(),
      };
      saveConfig([...(config?.lists ?? []), newList]);
      return newList;
    },
    [config, saveConfig]
  );

  const updateListTitle = useCallback(
    (listId: string, title: string) => {
      saveConfig(
        (config?.lists ?? []).map((l) =>
          l.id === listId ? { ...l, title: title.trim() } : l
        )
      );
    },
    [config, saveConfig]
  );

  const deleteList = useCallback(
    (listId: string) => {
      saveConfig((config?.lists ?? []).filter((l) => l.id !== listId));
    },
    [config, saveConfig]
  );

  const reorderLists = useCallback(
    (updated: List[]) => {
      saveConfig(updated);
    },
    [saveConfig]
  );

  const addItem = useCallback(
    (listId: string, text: string): ListItem => {
      const newItem: ListItem = {
        id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: text.trim(),
        checked: false,
        createdAt: new Date().toISOString(),
      };
      saveConfig(
        (config?.lists ?? []).map((l) =>
          l.id === listId ? { ...l, items: [...l.items, newItem] } : l
        )
      );
      return newItem;
    },
    [config, saveConfig]
  );

  const updateItem = useCallback(
    (listId: string, item: ListItem) => {
      saveConfig(
        (config?.lists ?? []).map((l) =>
          l.id === listId
            ? { ...l, items: l.items.map((i) => (i.id === item.id ? item : i)) }
            : l
        )
      );
    },
    [config, saveConfig]
  );

  const deleteItem = useCallback(
    (listId: string, itemId: string) => {
      saveConfig(
        (config?.lists ?? []).map((l) =>
          l.id === listId
            ? { ...l, items: l.items.filter((i) => i.id !== itemId) }
            : l
        )
      );
    },
    [config, saveConfig]
  );

  const reorderItems = useCallback(
    (listId: string, items: ListItem[]) => {
      saveConfig(
        (config?.lists ?? []).map((l) =>
          l.id === listId ? { ...l, items } : l
        )
      );
    },
    [config, saveConfig]
  );

  const toggleItem = useCallback(
    (listId: string, itemId: string) => {
      const currentLists = config?.lists ?? [];
      const list = currentLists.find((l) => l.id === listId);
      if (!list) return;
      const item = list.items.find((i) => i.id === itemId);
      if (!item) return;

      const newChecked = !item.checked;
      const updatedItem = { ...item, checked: newChecked };

      saveConfig(
        currentLists.map((l) =>
          l.id === listId
            ? { ...l, items: l.items.map((i) => (i.id === itemId ? updatedItem : i)) }
            : l
        )
      );

      // Sync to linked checklist item if present
      if (item.linkedChecklistId) {
        const today = new Date();
        const dateStr = formatDate(today);
        const completed = isCompleted(item.linkedChecklistId, today);
        // Only toggle if the checklist state doesn't match the new list state
        if (completed !== newChecked) {
          toggleCompletion(item.linkedChecklistId, today);
        }
      }
    },
    [config, saveConfig, toggleCompletion, isCompleted]
  );

  const addItemToToday = useCallback(
    (listId: string, itemId: string) => {
      const currentLists = config?.lists ?? [];
      const list = currentLists.find((l) => l.id === listId);
      if (!list) return;
      const item = list.items.find((i) => i.id === itemId);
      if (!item || item.linkedChecklistId) return; // Already linked

      const today = formatDate(new Date());
      const newChecklistItem = addChecklistItem({
        title: item.text,
        recurrence: 'once',
        startDate: today,
      });

      const updatedItem = { ...item, linkedChecklistId: newChecklistItem.id };
      saveConfig(
        currentLists.map((l) =>
          l.id === listId
            ? { ...l, items: l.items.map((i) => (i.id === itemId ? updatedItem : i)) }
            : l
        )
      );
    },
    [config, saveConfig, addChecklistItem]
  );

  // Called from the checklist screen when a checklist item is toggled
  // so list items linked to it stay in sync.
  const syncChecklistToList = useCallback(
    (checklistItemId: string, isNowCompleted: boolean) => {
      const currentLists = config?.lists ?? [];
      let changed = false;
      const updated = currentLists.map((l) => {
        const hasLinked = l.items.some(
          (i) => i.linkedChecklistId === checklistItemId && i.checked !== isNowCompleted
        );
        if (!hasLinked) return l;
        changed = true;
        return {
          ...l,
          items: l.items.map((i) =>
            i.linkedChecklistId === checklistItemId
              ? { ...i, checked: isNowCompleted }
              : i
          ),
        };
      });
      if (changed) saveConfig(updated);
    },
    [config, saveConfig]
  );

  return {
    lists,
    addList,
    updateListTitle,
    deleteList,
    reorderLists,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
    toggleItem,
    addItemToToday,
    syncChecklistToList,
  };
}
