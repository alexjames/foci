import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState,
  AppAction,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  ToolId,
  ToolConfig,
} from '../types';
import { migrateData } from '../storage/migration';
import { TOOL_REGISTRY } from '../constants/tools';

const initialState: AppState = {
  goals: [],
  settings: DEFAULT_SETTINGS,
  toolConfigs: {},
  homeTools: [],
  checklistItems: [],
  checklistCompletions: [],
  isLoading: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...state,
        goals: action.payload.goals,
        settings: action.payload.settings,
        toolConfigs: action.payload.toolConfigs,
        homeTools: action.payload.homeTools,
        checklistItems: action.payload.checklistItems,
        checklistCompletions: action.payload.checklistCompletions,
        isLoading: false,
      };
    case 'SET_GOALS':
      return { ...state, goals: action.payload };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_GOAL':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.id ? action.payload : g
        ),
      };
    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.payload),
      };
    case 'REORDER_GOALS':
      return { ...state, goals: action.payload };
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    // Tool config actions
    case 'SET_TOOL_CONFIG':
      return {
        ...state,
        toolConfigs: {
          ...state.toolConfigs,
          [action.payload.toolId]: action.payload,
        },
      };
    case 'REMOVE_TOOL_CONFIG': {
      const { [action.payload]: _, ...rest } = state.toolConfigs;
      return { ...state, toolConfigs: rest };
    }

    // Home tools actions
    case 'SET_HOME_TOOLS':
      return { ...state, homeTools: action.payload };
    case 'ADD_HOME_TOOL':
      return { ...state, homeTools: [...state.homeTools, action.payload] };
    case 'REMOVE_HOME_TOOL':
      return {
        ...state,
        homeTools: state.homeTools.filter((t) => t.toolId !== action.payload),
      };
    case 'REORDER_HOME_TOOLS':
      return { ...state, homeTools: action.payload };

    // Checklist actions
    case 'SET_CHECKLIST_ITEMS':
      return { ...state, checklistItems: action.payload };
    case 'ADD_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: [...state.checklistItems, action.payload],
      };
    case 'UPDATE_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: state.checklistItems.map((item) =>
          item.id === action.payload.id ? action.payload : item
        ),
      };
    case 'DELETE_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: state.checklistItems.filter(
          (item) => item.id !== action.payload
        ),
        checklistCompletions: state.checklistCompletions.filter(
          (c) => c.itemId !== action.payload
        ),
      };
    case 'SET_CHECKLIST_COMPLETIONS':
      return { ...state, checklistCompletions: action.payload };
    case 'TOGGLE_CHECKLIST_COMPLETION': {
      const { itemId, date } = action.payload;
      const exists = state.checklistCompletions.some(
        (c) => c.itemId === itemId && c.date === date
      );
      return {
        ...state,
        checklistCompletions: exists
          ? state.checklistCompletions.filter(
              (c) => !(c.itemId === itemId && c.date === date)
            )
          : [...state.checklistCompletions, { itemId, date }],
      };
    }

    case 'UPDATE_CHECKLIST_COMPLETION': {
      const updated = action.payload;
      const exists = state.checklistCompletions.some(
        (c) => c.itemId === updated.itemId && c.date === updated.date
      );
      return {
        ...state,
        checklistCompletions: exists
          ? state.checklistCompletions.map((c) =>
              c.itemId === updated.itemId && c.date === updated.date ? updated : c
            )
          : [...state.checklistCompletions, updated],
      };
    }

    case 'MOVE_TO_TRASH':
      return {
        ...state,
        checklistItems: state.checklistItems.map((item) =>
          item.id === action.payload.itemId
            ? { ...item, trashedAt: action.payload.trashedAt }
            : item
        ),
      };

    case 'RESTORE_FROM_TRASH':
      return {
        ...state,
        checklistItems: state.checklistItems.map((item) =>
          item.id === action.payload
            ? { ...item, trashedAt: undefined }
            : item
        ),
        // Remove completions so it appears pending again
        checklistCompletions: state.checklistCompletions.filter(
          (c) => c.itemId !== action.payload
        ),
      };

    case 'DELETE_TRASH_ITEM':
      return {
        ...state,
        checklistItems: state.checklistItems.filter((item) => item.id !== action.payload),
        checklistCompletions: state.checklistCompletions.filter((c) => c.itemId !== action.payload),
      };

    case 'PRUNE_TRASH': {
      const todayStr = action.payload;
      const cutoff = (() => {
        const d = new Date(todayStr);
        d.setDate(d.getDate() - 7);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();
      const pruned = state.checklistItems.filter(
        (item) => !(item.trashedAt && item.trashedAt <= cutoff)
      );
      const keptIds = new Set(pruned.map((i) => i.id));
      return {
        ...state,
        checklistItems: pruned,
        checklistCompletions: state.checklistCompletions.filter((c) => keptIds.has(c.itemId)),
      };
    }

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({ state: initialState, dispatch: () => {} });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load all state from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [
          goalsJson,
          settingsJson,
          toolConfigsJson,
          homeToolsJson,
          checklistItemsJson,
          checklistCompletionsJson,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.GOALS),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
          AsyncStorage.getItem(STORAGE_KEYS.TOOL_CONFIGS),
          AsyncStorage.getItem(STORAGE_KEYS.HOME_TOOLS),
          AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_ITEMS),
          AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_COMPLETIONS),
        ]);

        const goals = goalsJson ? JSON.parse(goalsJson) : [];
        const rawSettings = settingsJson ? JSON.parse(settingsJson) : null;
        const settings = rawSettings
          ? { ...DEFAULT_SETTINGS, ...rawSettings }
          : DEFAULT_SETTINGS;
        const toolConfigs = toolConfigsJson ? JSON.parse(toolConfigsJson) : null;
        const homeTools = homeToolsJson ? JSON.parse(homeToolsJson) : null;

        // Run migration for old data format
        const migrated = await migrateData(goals, rawSettings, toolConfigs, homeTools);

        // Ensure every tool in the registry has an entry in homeTools (preserves saved order,
        // appends any new tools that were added in a later version)
        const seededHomeTools = [...migrated.homeTools];
        for (const tool of TOOL_REGISTRY) {
          if (!seededHomeTools.some((t) => t.toolId === tool.id)) {
            seededHomeTools.push({ toolId: tool.id, order: seededHomeTools.length });
          }
        }

        const loadedItems: import('../types').ChecklistItem[] = checklistItemsJson
          ? JSON.parse(checklistItemsJson)
          : [];
        const loadedCompletions: import('../types').ChecklistCompletion[] = checklistCompletionsJson
          ? JSON.parse(checklistCompletionsJson)
          : [];

        const todayStr = (() => {
          const d = new Date();
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        })();

        // Move once-tasks completed before today into trash (end-of-day trash logic).
        // Recurring tasks keep completions for history.
        const completionsByItem = new Map<string, string>(); // itemId -> earliest completion date
        for (const c of loadedCompletions) {
          const existing = completionsByItem.get(c.itemId);
          if (!existing || c.date < existing) completionsByItem.set(c.itemId, c.date);
        }
        const trashedItems = loadedItems.map((item) => {
          if (item.trashedAt) return item; // already trashed
          if (item.kind === 'template') return item;
          if (item.recurrence !== 'once') return item;
          const completedDate = completionsByItem.get(item.id);
          if (completedDate && completedDate < todayStr) {
            return { ...item, trashedAt: completedDate };
          }
          return item;
        });

        // Prune completions for once-items now in trash (they're tracked by trashedAt)
        const trashedIds = new Set(trashedItems.filter((i) => i.trashedAt).map((i) => i.id));
        const prunedCompletions = loadedCompletions.filter((c) => !trashedIds.has(c.itemId));

        // Prune trash items older than 7 days
        const cutoff = (() => {
          const d = new Date(todayStr);
          d.setDate(d.getDate() - 7);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();
        const finalItems = trashedItems.filter(
          (item) => !(item.trashedAt && item.trashedAt <= cutoff)
        );
        const keptIds = new Set(finalItems.map((i) => i.id));
        const finalCompletions = prunedCompletions.filter((c) => keptIds.has(c.itemId));

        dispatch({
          type: 'LOAD_STATE',
          payload: {
            goals,
            settings,
            toolConfigs: migrated.toolConfigs,
            homeTools: seededHomeTools,
            checklistItems: finalItems,
            checklistCompletions: finalCompletions,
          },
        });
      } catch (e) {
        console.error('Failed to load state:', e);
        dispatch({
          type: 'LOAD_STATE',
          payload: {
            goals: [],
            settings: DEFAULT_SETTINGS,
            toolConfigs: {},
            homeTools: [],
            checklistItems: [],
            checklistCompletions: [],
          },
        });
      }
    })();
  }, []);

  // Persist goals
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(state.goals));
    }
  }, [state.goals, state.isLoading]);

  // Persist settings
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    }
  }, [state.settings, state.isLoading]);

  // Persist tool configs
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.TOOL_CONFIGS, JSON.stringify(state.toolConfigs));
    }
  }, [state.toolConfigs, state.isLoading]);

  // Persist home tools
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.HOME_TOOLS, JSON.stringify(state.homeTools));
    }
  }, [state.homeTools, state.isLoading]);

  // Persist checklist items
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(
        STORAGE_KEYS.CHECKLIST_ITEMS,
        JSON.stringify(state.checklistItems)
      );
    }
  }, [state.checklistItems, state.isLoading]);

  // Persist checklist completions
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(
        STORAGE_KEYS.CHECKLIST_COMPLETIONS,
        JSON.stringify(state.checklistCompletions)
      );
    }
  }, [state.checklistCompletions, state.isLoading]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
