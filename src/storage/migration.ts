import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ToolConfig,
  HomeToolEntry,
  MementoMoriConfig,
  GoalsConfig,
  Goal,
  STORAGE_KEYS,
  ToolId,
} from '../types';

interface OldSettings {
  birthday?: string;
  lifeExpectancy?: number;
  [key: string]: unknown;
}

export async function migrateData(
  goals: Goal[],
  rawSettings: OldSettings | null,
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

  // Migrate birthday/lifeExpectancy from old settings to MementoMoriConfig
  if (rawSettings?.birthday && !toolConfigs['memento-mori']) {
    const mementoConfig: MementoMoriConfig = {
      toolId: 'memento-mori',
      birthday: rawSettings.birthday,
      lifeExpectancy: rawSettings.lifeExpectancy ?? 80,
      notificationEnabled: false,
    };
    toolConfigs['memento-mori'] = mementoConfig;

    if (!homeTools.some((t) => t.toolId === 'memento-mori')) {
      homeTools.push({ toolId: 'memento-mori', order: homeTools.length });
    }
    migrated = true;
  }

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
