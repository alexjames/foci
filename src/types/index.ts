export interface Goal {
  id: string;
  name: string;
  outcome?: string;
  why?: string;
  consequences?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface AppSettings {
  notificationTime: { hour: number; minute: number };
  notificationsEnabled: boolean;
  hasCompletedOnboarding: boolean;
  lastCommitDate?: string;
  birthday?: string;
  lifeExpectancy?: number;
}

export interface AppState {
  goals: Goal[];
  settings: AppSettings;
  isLoading: boolean;
}

export type AppAction =
  | { type: 'SET_GOALS'; payload: Goal[] }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'REORDER_GOALS'; payload: Goal[] }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_STATE'; payload: { goals: Goal[]; settings: AppSettings } };

export const STORAGE_KEYS = {
  GOALS: '@foci/goals',
  SETTINGS: '@foci/settings',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  notificationTime: { hour: 8, minute: 0 },
  notificationsEnabled: true,
  hasCompletedOnboarding: false,
  lastCommitDate: undefined,
  birthday: undefined,
  lifeExpectancy: 80,
};
