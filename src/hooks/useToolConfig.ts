import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { ToolId, ToolConfig } from '../types';

export function useToolConfig<T extends ToolConfig = ToolConfig>(toolId: ToolId) {
  const { state, dispatch } = useAppContext();

  const config = state.toolConfigs[toolId] as T | undefined;

  const setConfig = useCallback(
    (toolConfig: T) => {
      dispatch({ type: 'SET_TOOL_CONFIG', payload: toolConfig });
    },
    [dispatch]
  );

  const removeConfig = useCallback(() => {
    dispatch({ type: 'REMOVE_TOOL_CONFIG', payload: toolId });
  }, [dispatch, toolId]);

  return { config, setConfig, removeConfig };
}
