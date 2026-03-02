// === TOOL SYSTEM ===

export type ToolId = 'memento-mori' | 'goals' | 'identities' | 'breathing' | 'focus-timer' | 'deadline-tracker' | 'morning-routine' | 'evening-routine' | 'streak-tracker' | 'tally-counter' | 'routines' | 'motivational-quotes' | 'events' | 'lists' | 'priorities';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  tagline: string;
  icon: string;
  description: string;
}

export interface MementoMoriConfig {
  toolId: 'memento-mori';
  birthday?: string;
  lifeExpectancy: number;
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
}

export interface GoalsConfig {
  toolId: 'goals';
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
}

export interface IdentityAffirmation {
  id: string;
  text: string;
  createdAt: string;
}

export interface Identity {
  id: string;
  title: string;
  affirmations: IdentityAffirmation[];
  createdAt: string;
}

export interface IdentitiesConfig {
  toolId: 'identities';
  identities: Identity[];
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
}

export interface BreathingConfig {
  toolId: 'breathing';
  selectedPresetId: string;
  durationSeconds: number;
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
}

export interface BreathingPreset {
  id: string;
  name: string;
  description: string;
  phases: BreathingPhase[];
}

export interface BreathingPhase {
  label: string;
  durationSeconds: number;
}

export type FocusTimerAlarm = 'sound' | 'vibration' | 'both';

export interface FocusTimerConfig {
  toolId: 'focus-timer';
  lastDurationSeconds: number;
  breakDurationSeconds: number;
  alarmType: FocusTimerAlarm;
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
}

export type DeadlineReminderType = '1-week' | '3-days' | '1-day';

export interface Deadline {
  id: string;
  title: string;
  date: string; // ISO date string
  color?: string;
  reminders: DeadlineReminderType[];
  createdAt: string;
}

export interface DeadlineTrackerConfig {
  toolId: 'deadline-tracker';
  deadlines: Deadline[];
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
}

export interface Habit {
  id: string;
  title: string;
  color?: string;
  completions: string[]; // 'YYYY-MM-DD' strings
  createdAt: string;
  notificationEnabled?: boolean;
  notificationTime?: { hour: number; minute: number };
  notificationDays?: number[]; // 0=Sun … 6=Sat; undefined means every day
  notificationId?: string; // expo-notifications identifier
}

export interface HabitTrackerConfig {
  toolId: 'streak-tracker';
  habits: Habit[];
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
}

export interface TallyCounter {
  id: string;
  title: string;
  count: number;
  color?: string;
  createdAt: string;
}

export interface TallyCounterConfig {
  toolId: 'tally-counter';
  counters: TallyCounter[];
}

export interface RoutinePresetCard {
  id: string;
  title: string;
  description: string;
  category: 'morning' | 'evening' | 'general';
}

export interface RoutineCustomCard {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface RoutineConfig {
  toolId: 'morning-routine' | 'evening-routine';
  orderedCards: string[];
  customCards: RoutineCustomCard[];
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
}

export interface Routine {
  id: string;
  title: string;
  icon: string;
  orderedCards: string[];
  customCards: RoutineCustomCard[];
  cardDurations?: Record<string, number>; // cardId → seconds, absent = 180s default
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
  createdAt: string;
}

export interface RoutinesConfig {
  toolId: 'routines';
  routines: Routine[];
}

export interface MotivationalQuotesConfig {
  toolId: 'motivational-quotes';
  notificationEnabled: boolean;
  notificationTime?: { hour: number; minute: number };
}

export type EventRecurrence =
  | { type: 'none' }
  | { type: 'annually' }
  | { type: 'monthly' }                 // same day every month
  | { type: 'every-x-months'; months: number }
  | { type: 'every-x-days'; days: number };

export interface Event {
  id: string;
  title: string;
  date: string; // ISO date string
  icon: string; // Ionicons name
  color?: string;
  recurrence: EventRecurrence;
  createdAt: string;
}

export interface EventsConfig {
  toolId: 'events';
  events: Event[];
}

export interface ListItem {
  id: string;
  text: string;
  checked: boolean;
  linkedChecklistId?: string;
  createdAt: string;
}

export interface List {
  id: string;
  title: string;
  items: ListItem[];
  createdAt: string;
}

export interface ListsConfig {
  toolId: 'lists';
  lists: List[];
}

export interface Priority {
  id: string;
  text: string; // max 140 chars
  goalId: string | 'non-goal';
  createdAt: string;
}

export interface PrioritiesConfig {
  toolId: 'priorities';
  priorities: Priority[];
}

export type ToolConfig = MementoMoriConfig | GoalsConfig | IdentitiesConfig | BreathingConfig | FocusTimerConfig | DeadlineTrackerConfig | HabitTrackerConfig | RoutineConfig | TallyCounterConfig | RoutinesConfig | MotivationalQuotesConfig | EventsConfig | ListsConfig | PrioritiesConfig;

export interface HomeToolEntry {
  toolId: ToolId;
  order: number;
}

// === CHECKLIST SYSTEM ===

export type RecurrenceType = 'once' | 'daily' | 'specific-days' | 'every-n-days' | 'weekdays' | 'weekends';

export type ChecklistItemKind = 'task' | 'recurring' | 'template';

export interface Subtask {
  id: string;
  title: string;
  completedDates: string[]; // YYYY-MM-DD strings
}

export interface ChecklistItem {
  id: string;
  title: string;
  recurrence: RecurrenceType;
  specificDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  everyNDays?: number;
  startDate: string;
  createdAt: string;
  subtasks?: Subtask[];
  kind?: ChecklistItemKind; // undefined = 'task' for backward compat
  trashedAt?: string;       // YYYY-MM-DD, set when a once-task completes at EOD
  recurringRuleId?: string; // ID of the parent recurring rule item (for spawned instances)
  periodDate?: string;      // YYYY-MM-DD of the canonical period date this instance covers
}

export interface ChecklistCompletion {
  itemId: string;
  date: string; // YYYY-MM-DD
  notes?: string; // e.g. "Focus session: 12:34"
}

// === GOALS ===

export interface Goal {
  id: string;
  name: string;
  color?: string;
  outcome?: string;
  why?: string;
  consequences?: string;
  dueDate?: string;      // ISO date string
  measurement?: string;  // how to track progress
  signature?: string;    // JSON of {paths: Point[][], viewBox: string}
  createdAt: string;
  updatedAt: string;
  order: number;
}

// === APP STATE ===

export interface AppSettings {
  notificationTime: { hour: number; minute: number };
  notificationsEnabled: boolean;
  hasCompletedOnboarding: boolean;
  lastCommitDate?: string;
}

export interface AppState {
  goals: Goal[];
  settings: AppSettings;
  toolConfigs: Partial<Record<ToolId, ToolConfig>>;
  homeTools: HomeToolEntry[];
  checklistItems: ChecklistItem[];
  checklistCompletions: ChecklistCompletion[];
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
  | { type: 'LOAD_STATE'; payload: {
      goals: Goal[];
      settings: AppSettings;
      toolConfigs: Partial<Record<ToolId, ToolConfig>>;
      homeTools: HomeToolEntry[];
      checklistItems: ChecklistItem[];
      checklistCompletions: ChecklistCompletion[];
    }}
  | { type: 'SET_TOOL_CONFIG'; payload: ToolConfig }
  | { type: 'REMOVE_TOOL_CONFIG'; payload: ToolId }
  | { type: 'SET_HOME_TOOLS'; payload: HomeToolEntry[] }
  | { type: 'ADD_HOME_TOOL'; payload: HomeToolEntry }
  | { type: 'REMOVE_HOME_TOOL'; payload: ToolId }
  | { type: 'REORDER_HOME_TOOLS'; payload: HomeToolEntry[] }
  | { type: 'SET_CHECKLIST_ITEMS'; payload: ChecklistItem[] }
  | { type: 'ADD_CHECKLIST_ITEM'; payload: ChecklistItem }
  | { type: 'UPDATE_CHECKLIST_ITEM'; payload: ChecklistItem }
  | { type: 'DELETE_CHECKLIST_ITEM'; payload: string }
  | { type: 'SET_CHECKLIST_COMPLETIONS'; payload: ChecklistCompletion[] }
  | { type: 'TOGGLE_CHECKLIST_COMPLETION'; payload: { itemId: string; date: string } }
  | { type: 'UPDATE_CHECKLIST_COMPLETION'; payload: ChecklistCompletion }
  | { type: 'MOVE_TO_TRASH'; payload: { itemId: string; trashedAt: string } }
  | { type: 'RESTORE_FROM_TRASH'; payload: string }
  | { type: 'DELETE_TRASH_ITEM'; payload: string }
  | { type: 'PRUNE_TRASH'; payload: string }                  // payload = today YYYY-MM-DD
  | { type: 'SPAWN_RECURRING_INSTANCES'; payload: { today: string } }
  | { type: 'DELETE_RECURRING_RULE'; payload: string };       // ruleId — deletes rule + all instances

export const STORAGE_KEYS = {
  GOALS: '@foci/goals',
  SETTINGS: '@foci/settings',
  TOOL_CONFIGS: '@foci/tool-configs',
  HOME_TOOLS: '@foci/home-tools',
  CHECKLIST_ITEMS: '@foci/checklist-items',
  CHECKLIST_COMPLETIONS: '@foci/checklist-completions',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  notificationTime: { hour: 8, minute: 0 },
  notificationsEnabled: true,
  hasCompletedOnboarding: false,
  lastCommitDate: undefined,
};
