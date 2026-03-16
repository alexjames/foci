import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ToolConfig,
  HomeToolEntry,
  GoalsConfig,
  Goal,
  STORAGE_KEYS,
  ToolId,
} from '../types';

export async function migrateData(
  goals: Goal[],
  rawSettings: Record<string, unknown> | null,
  existingToolConfigs: Partial<Record<ToolId, ToolConfig>> | null,
  existingHomeTools: HomeToolEntry[] | null
): Promise<{
  toolConfigs: Partial<Record<ToolId, ToolConfig>>;
  homeTools: HomeToolEntry[];
  migrated: boolean;
}> {
  const toolConfigs: Partial<Record<ToolId, ToolConfig>> = existingToolConfigs ?? {};
  const homeTools: HomeToolEntry[] = existingHomeTools ?? [];
  let migrated = false;

  // If goals exist but no goals config, create one and add to home
  if (goals.length > 0 && !toolConfigs['goals']) {
    const goalsConfig: GoalsConfig = {
      toolId: 'goals',
      notificationEnabled: false,
    };
    toolConfigs['goals'] = goalsConfig;

    if (!homeTools.some((t) => t.toolId === 'goals')) {
      homeTools.push({ toolId: 'goals', order: homeTools.length });
    }
    migrated = true;
  }

  // Persist migrated data
  if (migrated) {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.TOOL_CONFIGS, JSON.stringify(toolConfigs)),
      AsyncStorage.setItem(STORAGE_KEYS.HOME_TOOLS, JSON.stringify(homeTools)),
    ]);
  }

  return { toolConfigs, homeTools, migrated };
}
