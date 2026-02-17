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

        dispatch({
          type: 'LOAD_STATE',
          payload: {
            goals,
            settings,
            toolConfigs: migrated.toolConfigs,
            homeTools: migrated.homeTools,
            checklistItems: checklistItemsJson
              ? JSON.parse(checklistItemsJson)
              : [],
            checklistCompletions: checklistCompletionsJson
              ? JSON.parse(checklistCompletionsJson)
              : [],
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
