import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState,
  AppAction,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
} from '../types';

const initialState: AppState = {
  goals: [],
  settings: DEFAULT_SETTINGS,
  isLoading: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...state,
        goals: action.payload.goals,
        settings: action.payload.settings,
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

  useEffect(() => {
    (async () => {
      const [goalsJson, settingsJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
      ]);
      dispatch({
        type: 'LOAD_STATE',
        payload: {
          goals: goalsJson ? JSON.parse(goalsJson) : [],
          settings: settingsJson
            ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) }
            : DEFAULT_SETTINGS,
        },
      });
    })();
  }, []);

  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(state.goals));
    }
  }, [state.goals, state.isLoading]);

  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(state.settings)
      );
    }
  }, [state.settings, state.isLoading]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
