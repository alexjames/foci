import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../context/AppContext';
import { AppSettings, STORAGE_KEYS } from '../types';

export function useSettings() {
  const { state, dispatch } = useAppContext();

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      dispatch({ type: 'SET_SETTINGS', payload: updates });
    },
    [dispatch]
  );

  const completeOnboarding = useCallback(() => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: { hasCompletedOnboarding: true },
    });
  }, [dispatch]);

  const resetApp = useCallback(async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.GOALS,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.TOOL_CONFIGS,
      STORAGE_KEYS.HOME_TOOLS,
      STORAGE_KEYS.CHECKLIST_ITEMS,
      STORAGE_KEYS.CHECKLIST_COMPLETIONS,
    ]);
    dispatch({
      type: 'SET_SETTINGS',
      payload: { hasCompletedOnboarding: false },
    });
    dispatch({ type: 'SET_GOALS', payload: [] });
    dispatch({ type: 'SET_HOME_TOOLS', payload: [] });
    dispatch({ type: 'SET_CHECKLIST_ITEMS', payload: [] });
    dispatch({ type: 'SET_CHECKLIST_COMPLETIONS', payload: [] });
  }, [dispatch]);

  const recordCommit = useCallback(() => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: { lastCommitDate: new Date().toISOString() },
    });
  }, [dispatch]);

  return {
    settings: state.settings,
    isLoading: state.isLoading,
    updateSettings,
    completeOnboarding,
    resetApp,
    recordCommit,
  };
}
