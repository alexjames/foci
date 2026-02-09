import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { AppSettings } from '../types';

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

  const resetOnboarding = useCallback(() => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: { hasCompletedOnboarding: false },
    });
    dispatch({ type: 'SET_GOALS', payload: [] });
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
    resetOnboarding,
    recordCommit,
  };
}
