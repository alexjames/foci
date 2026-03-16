import { Platform } from 'react-native';

let LiveActivity: typeof import('expo-live-activity') | null = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    LiveActivity = require('expo-live-activity');
  } catch {}
}

export async function startFocusLiveActivity(
  title: string,
  endTimeMs: number,
): Promise<string | null> {
  if (!LiveActivity) return null;
  try {
    const id = await LiveActivity.startActivity({
      title: 'Foci',
      subtitle: title,
      progressBar: { date: endTimeMs },
    });
    return id ?? null;
  } catch {
    return null;
  }
}

export async function stopFocusLiveActivity(
  activityId: string | null,
): Promise<void> {
  if (!LiveActivity || !activityId) return;
  try {
    await LiveActivity.stopActivity(activityId, {
      title: 'Foci',
      subtitle: 'Complete',
      progressBar: { progress: 1 },
    });
  } catch {}
}
