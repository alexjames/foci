import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Goal } from '../types';

export function useGoals() {
  const { state, dispatch } = useAppContext();

  const addGoal = useCallback(
    (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
      const now = new Date().toISOString();
      const newGoal: Goal = {
        ...goal,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
        createdAt: now,
        updatedAt: now,
        order: state.goals.length,
      };
      dispatch({ type: 'ADD_GOAL', payload: newGoal });
      return newGoal;
    },
    [state.goals.length, dispatch]
  );

  const updateGoal = useCallback(
    (id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt' | 'order'>>) => {
      const existing = state.goals.find((g) => g.id === id);
      if (!existing) return;
      dispatch({
        type: 'UPDATE_GOAL',
        payload: {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      });
    },
    [state.goals, dispatch]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_GOAL', payload: id });
    },
    [dispatch]
  );

  const setGoals = useCallback(
    (goals: Goal[]) => {
      dispatch({ type: 'SET_GOALS', payload: goals });
    },
    [dispatch]
  );

  const sortedGoals = [...state.goals].sort((a, b) => a.order - b.order);

  return {
    goals: sortedGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    setGoals,
    canAddGoal: state.goals.length < 4,
  };
}
