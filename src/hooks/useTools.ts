import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { ToolId, HomeToolEntry, ToolDefinition } from '../types';
import { TOOL_REGISTRY } from '../constants/tools';

export function useTools() {
  const { state, dispatch } = useAppContext();

  const homeTools = [...state.homeTools].sort((a, b) => a.order - b.order);

  // All registry tools in persisted order (falls back to registry order for unseeded tools)
  const orderedTools: ToolDefinition[] = homeTools.length > 0
    ? homeTools
        .map((entry) => TOOL_REGISTRY.find((t) => t.id === entry.toolId))
        .filter((t): t is ToolDefinition => t !== undefined)
    : TOOL_REGISTRY;

  const isToolOnHome = useCallback(
    (toolId: ToolId) => state.homeTools.some((t) => t.toolId === toolId),
    [state.homeTools]
  );

  const addToolToHome = useCallback(
    (toolId: ToolId) => {
      if (state.homeTools.some((t) => t.toolId === toolId)) return;
      dispatch({
        type: 'ADD_HOME_TOOL',
        payload: { toolId, order: state.homeTools.length },
      });
    },
    [dispatch, state.homeTools]
  );

  const removeToolFromHome = useCallback(
    (toolId: ToolId) => {
      dispatch({ type: 'REMOVE_HOME_TOOL', payload: toolId });
    },
    [dispatch]
  );

  const reorderHomeTools = useCallback(
    (tools: HomeToolEntry[]) => {
      dispatch({
        type: 'REORDER_HOME_TOOLS',
        payload: tools.map((t, i) => ({ ...t, order: i })),
      });
    },
    [dispatch]
  );

  return {
    homeTools,
    orderedTools,
    isToolOnHome,
    addToolToHome,
    removeToolFromHome,
    reorderHomeTools,
  };
}
