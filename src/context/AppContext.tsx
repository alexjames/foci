import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState,
  AppAction,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  ToolId,
  ToolConfig,
} from '../types';
import { migrateData } from '../storage/migration';
import { TOOL_REGISTRY } from '../constants/tools';

const initialState: AppState = {
  goals: [],
  settings: DEFAULT_SETTINGS,
  toolConfigs: {},
  homeTools: [],
  checklistItems: [],
  checklistCompletions: [],
  isLoading: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...state,
        goals: action.payload.goals,
        settings: action.payload.settings,
        toolConfigs: action.payload.toolConfigs,
        homeTools: action.payload.homeTools,
        checklistItems: action.payload.checklistItems,
        checklistCompletions: action.payload.checklistCompletions,
        isLoading: false,
      };
    case 'SET_GOALS':
      return { ...state, goals: action.payload };
    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, action.payload] };
    case 'UPDATE_GOAL':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.id ? action.payload : g
        ),
      };
    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.payload),
      };
    case 'REORDER_GOALS':
      return { ...state, goals: action.payload };
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    // Tool config actions
    case 'SET_TOOL_CONFIG':
      return {
        ...state,
        toolConfigs: {
          ...state.toolConfigs,
          [action.payload.toolId]: action.payload,
        },
      };
    case 'REMOVE_TOOL_CONFIG': {
      const { [action.payload]: _, ...rest } = state.toolConfigs;
      return { ...state, toolConfigs: rest };
    }

    // Home tools actions
    case 'SET_HOME_TOOLS':
      return { ...state, homeTools: action.payload };
    case 'ADD_HOME_TOOL':
      return { ...state, homeTools: [...state.homeTools, action.payload] };
    case 'REMOVE_HOME_TOOL':
      return {
        ...state,
        homeTools: state.homeTools.filter((t) => t.toolId !== action.payload),
      };
    case 'REORDER_HOME_TOOLS':
      return { ...state, homeTools: action.payload };

    // Checklist actions
    case 'SET_CHECKLIST_ITEMS':
      return { ...state, checklistItems: action.payload };
    case 'ADD_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: [...state.checklistItems, action.payload],
      };
    case 'UPDATE_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: state.checklistItems.map((item) =>
          item.id === action.payload.id ? action.payload : item
        ),
      };
    case 'DELETE_CHECKLIST_ITEM':
      return {
        ...state,
        checklistItems: state.checklistItems.filter(
          (item) => item.id !== action.payload
        ),
        checklistCompletions: state.checklistCompletions.filter(
          (c) => c.itemId !== action.payload
        ),
      };
    case 'SET_CHECKLIST_COMPLETIONS':
      return { ...state, checklistCompletions: action.payload };
    case 'TOGGLE_CHECKLIST_COMPLETION': {
      const { itemId, date } = action.payload;
      const exists = state.checklistCompletions.some(
        (c) => c.itemId === itemId && c.date === date
      );
      return {
        ...state,
        checklistCompletions: exists
          ? state.checklistCompletions.filter(
              (c) => !(c.itemId === itemId && c.date === date)
            )
          : [...state.checklistCompletions, { itemId, date }],
      };
    }

    case 'UPDATE_CHECKLIST_COMPLETION': {
      const updated = action.payload;
      const exists = state.checklistCompletions.some(
        (c) => c.itemId === updated.itemId && c.date === updated.date
      );
      return {
        ...state,
        checklistCompletions: exists
          ? state.checklistCompletions.map((c) =>
              c.itemId === updated.itemId && c.date === updated.date ? updated : c
            )
          : [...state.checklistCompletions, updated],
      };
    }

    case 'MOVE_TO_TRASH':
      return {
        ...state,
        checklistItems: state.checklistItems.map((item) =>
          item.id === action.payload.itemId
            ? { ...item, trashedAt: action.payload.trashedAt }
            : item
        ),
      };

    case 'RESTORE_FROM_TRASH':
      return {
        ...state,
        checklistItems: state.checklistItems.map((item) =>
          item.id === action.payload
            ? { ...item, trashedAt: undefined }
            : item
        ),
        // Remove completions so it appears pending again
        checklistCompletions: state.checklistCompletions.filter(
          (c) => c.itemId !== action.payload
        ),
      };

    case 'DELETE_TRASH_ITEM':
      return {
        ...state,
        checklistItems: state.checklistItems.filter((item) => item.id !== action.payload),
        checklistCompletions: state.checklistCompletions.filter((c) => c.itemId !== action.payload),
      };

    case 'PRUNE_TRASH': {
      const todayStr = action.payload;
      const cutoff = (() => {
        const d = new Date(todayStr);
        d.setDate(d.getDate() - 7);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();
      const pruned = state.checklistItems.filter(
        (item) => !(item.trashedAt && item.trashedAt <= cutoff)
      );
      const keptIds = new Set(pruned.map((i) => i.id));
      return {
        ...state,
        checklistItems: pruned,
        checklistCompletions: state.checklistCompletions.filter((c) => keptIds.has(c.itemId)),
      };
    }

    case 'DELETE_RECURRING_RULE': {
      const ruleId = action.payload;
      const kept = state.checklistItems.filter(
        (item) => item.id !== ruleId && item.recurringRuleId !== ruleId
      );
      const keptIds = new Set(kept.map((i) => i.id));
      return {
        ...state,
        checklistItems: kept,
        checklistCompletions: state.checklistCompletions.filter((c) => keptIds.has(c.itemId)),
      };
    }

    case 'SPAWN_RECURRING_INSTANCES': {
      const { today: todayStr } = action.payload;

      function parseDate(s: string): Date {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      function fmtDate(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      function addDaysLocal(d: Date, n: number): Date {
        const r = new Date(d);
        r.setDate(r.getDate() + n);
        return r;
      }

      // Given a recurring rule, compute the two period start dates: current and next.
      // Returns [currentDate, nextDate] as YYYY-MM-DD strings, or null if rule has no due dates.
      function getPeriodDates(rule: import('../types').ChecklistItem, today: Date): [string, string] | null {
        const startDate = parseDate(rule.startDate);
        switch (rule.recurrence) {
          case 'daily': {
            return [fmtDate(today), fmtDate(addDaysLocal(today, 1))];
          }
          case 'every-n-days': {
            const n = rule.everyNDays;
            if (!n || n <= 0) return null;
            const diffMs = today.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffMs / 86400000);
            if (diffDays < 0) {
              // rule starts in the future — current period = startDate, next = startDate+n
              return [fmtDate(startDate), fmtDate(addDaysLocal(startDate, n))];
            }
            const periodIndex = Math.floor(diffDays / n);
            const currentStart = addDaysLocal(startDate, periodIndex * n);
            const nextStart = addDaysLocal(currentStart, n);
            return [fmtDate(currentStart), fmtDate(nextStart)];
          }
          case 'weekdays': {
            // Current = today if weekday, else last weekday
            let cur = new Date(today);
            while (cur.getDay() === 0 || cur.getDay() === 6) cur = addDaysLocal(cur, -1);
            let nxt = addDaysLocal(cur, 1);
            while (nxt.getDay() === 0 || nxt.getDay() === 6) nxt = addDaysLocal(nxt, 1);
            return [fmtDate(cur), fmtDate(nxt)];
          }
          case 'weekends': {
            let cur = new Date(today);
            while (cur.getDay() !== 0 && cur.getDay() !== 6) cur = addDaysLocal(cur, -1);
            let nxt = addDaysLocal(cur, 1);
            while (nxt.getDay() !== 0 && nxt.getDay() !== 6) nxt = addDaysLocal(nxt, 1);
            return [fmtDate(cur), fmtDate(nxt)];
          }
          case 'specific-days': {
            const days = rule.specificDays;
            if (!days || days.length === 0) return null;
            // Find most recent occurrence on/before today
            let cur = new Date(today);
            for (let i = 0; i < 8; i++) {
              if (days.includes(cur.getDay())) break;
              cur = addDaysLocal(cur, -1);
            }
            if (!days.includes(cur.getDay())) return null;
            let nxt = addDaysLocal(cur, 1);
            for (let i = 0; i < 8; i++) {
              if (days.includes(nxt.getDay())) break;
              nxt = addDaysLocal(nxt, 1);
            }
            return [fmtDate(cur), fmtDate(nxt)];
          }
          default:
            return null;
        }
      }

      const todayDate = parseDate(todayStr);
      const rules = state.checklistItems.filter(
        (item) =>
          item.recurrence !== 'once' &&
          !item.recurringRuleId &&
          !item.trashedAt &&
          item.kind !== 'template'
      );

      let items = [...state.checklistItems];

      for (const rule of rules) {
        const periods = getPeriodDates(rule, todayDate);
        if (!periods) continue;
        const [currentDateStr, nextDateStr] = periods;

        // Existing instances for this rule (match by periodDate if set, else by startDate for legacy)
        const existingInstances = items.filter((i) => i.recurringRuleId === rule.id);

        // Desired period dates: current and next
        const desiredPeriods = new Set([currentDateStr, nextDateStr]);

        // Determine which periods already have instances (by periodDate, falling back to startDate)
        const coveredPeriods = new Set(
          existingInstances.map((i) => i.periodDate ?? i.startDate)
        );

        // Spawn missing instances for periods not yet covered
        for (const periodDateStr of desiredPeriods) {
          if (!coveredPeriods.has(periodDateStr)) {
            const newInstance: import('../types').ChecklistItem = {
              id: `ri-${rule.id}-${periodDateStr}-${Math.random().toString(36).slice(2, 5)}`,
              title: rule.title,
              recurrence: 'once',
              startDate: periodDateStr,
              periodDate: periodDateStr,
              createdAt: new Date().toISOString(),
              subtasks: rule.subtasks?.map((s) => ({ ...s, completedDates: [] })),
              recurringRuleId: rule.id,
            };
            items.push(newInstance);
          } else {
            // Update title of existing instance to match rule (handles rule title edits)
            items = items.map((i) => {
              if (i.recurringRuleId !== rule.id) return i;
              if ((i.periodDate ?? i.startDate) !== periodDateStr) return i;
              // Ensure periodDate is set for legacy instances that only had startDate
              const withPeriodDate = i.periodDate ? i : { ...i, periodDate: i.startDate };
              return withPeriodDate.title !== rule.title
                ? { ...withPeriodDate, title: rule.title }
                : withPeriodDate;
            });
          }
        }

        // Remove stale instances: any instance of this rule whose period is NOT in desiredPeriods.
        // Uses periodDate (or startDate for legacy) to identify which period the instance covers.
        items = items.filter((i) => {
          if (i.recurringRuleId !== rule.id) return true;
          const instancePeriod = i.periodDate ?? i.startDate;
          return desiredPeriods.has(instancePeriod); // keep only current+next period instances
        });
      }

      const keptItemIds = new Set(items.map((i) => i.id));
      const prunedCompletions = state.checklistCompletions.filter((c) => keptItemIds.has(c.itemId));
      return { ...state, checklistItems: items, checklistCompletions: prunedCompletions };
    }

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({ state: initialState, dispatch: () => {} });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load all state from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [
          goalsJson,
          settingsJson,
          toolConfigsJson,
          homeToolsJson,
          checklistItemsJson,
          checklistCompletionsJson,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.GOALS),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
          AsyncStorage.getItem(STORAGE_KEYS.TOOL_CONFIGS),
          AsyncStorage.getItem(STORAGE_KEYS.HOME_TOOLS),
          AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_ITEMS),
          AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_COMPLETIONS),
        ]);

        const goals = goalsJson ? JSON.parse(goalsJson) : [];
        const rawSettings = settingsJson ? JSON.parse(settingsJson) : null;
        const settings = rawSettings
          ? { ...DEFAULT_SETTINGS, ...rawSettings }
          : DEFAULT_SETTINGS;
        const toolConfigs = toolConfigsJson ? JSON.parse(toolConfigsJson) : null;
        const homeTools = homeToolsJson ? JSON.parse(homeToolsJson) : null;

        // Run migration for old data format
        const migrated = await migrateData(goals, rawSettings, toolConfigs, homeTools);

        // Ensure every tool in the registry has an entry in homeTools (preserves saved order,
        // appends any new tools that were added in a later version)
        const seededHomeTools = [...migrated.homeTools];
        for (const tool of TOOL_REGISTRY) {
          if (!seededHomeTools.some((t) => t.toolId === tool.id)) {
            seededHomeTools.push({ toolId: tool.id, order: seededHomeTools.length });
          }
        }

        const loadedItems: import('../types').ChecklistItem[] = checklistItemsJson
          ? JSON.parse(checklistItemsJson)
          : [];
        const loadedCompletions: import('../types').ChecklistCompletion[] = checklistCompletionsJson
          ? JSON.parse(checklistCompletionsJson)
          : [];

        const todayStr = (() => {
          const d = new Date();
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        })();

        // Move once-tasks completed before today into trash (end-of-day trash logic).
        // Recurring tasks keep completions for history.
        const completionsByItem = new Map<string, string>(); // itemId -> earliest completion date
        for (const c of loadedCompletions) {
          const existing = completionsByItem.get(c.itemId);
          if (!existing || c.date < existing) completionsByItem.set(c.itemId, c.date);
        }
        const trashedItems = loadedItems.map((item) => {
          if (item.trashedAt) return item; // already trashed
          if (item.kind === 'template') return item;
          if (item.recurrence !== 'once') return item;
          if (item.recurringRuleId) return item; // recurring instances are managed by spawn logic, not trash
          const completedDate = completionsByItem.get(item.id);
          if (completedDate && completedDate < todayStr) {
            return { ...item, trashedAt: completedDate };
          }
          return item;
        });

        // Prune completions for once-items now in trash (they're tracked by trashedAt)
        const trashedIds = new Set(trashedItems.filter((i) => i.trashedAt).map((i) => i.id));
        const prunedCompletions = loadedCompletions.filter((c) => !trashedIds.has(c.itemId));

        // Prune trash items older than 7 days
        const cutoff = (() => {
          const d = new Date(todayStr);
          d.setDate(d.getDate() - 7);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();
        const finalItems = trashedItems.filter(
          (item) => !(item.trashedAt && item.trashedAt <= cutoff)
        );
        const keptIds = new Set(finalItems.map((i) => i.id));
        const finalCompletions = prunedCompletions.filter((c) => keptIds.has(c.itemId));

        dispatch({
          type: 'LOAD_STATE',
          payload: {
            goals,
            settings,
            toolConfigs: migrated.toolConfigs,
            homeTools: seededHomeTools,
            checklistItems: finalItems,
            checklistCompletions: finalCompletions,
          },
        });
        // Spawn recurring instances for the current and next period after state is loaded
        dispatch({ type: 'SPAWN_RECURRING_INSTANCES', payload: { today: todayStr } });
      } catch (e) {
        console.error('Failed to load state:', e);
        dispatch({
          type: 'LOAD_STATE',
          payload: {
            goals: [],
            settings: DEFAULT_SETTINGS,
            toolConfigs: {},
            homeTools: [],
            checklistItems: [],
            checklistCompletions: [],
          },
        });
      }
    })();
  }, []);

  // Persist goals
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(state.goals));
    }
  }, [state.goals, state.isLoading]);

  // Persist settings
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
    }
  }, [state.settings, state.isLoading]);

  // Persist tool configs
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.TOOL_CONFIGS, JSON.stringify(state.toolConfigs));
    }
  }, [state.toolConfigs, state.isLoading]);

  // Persist home tools
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(STORAGE_KEYS.HOME_TOOLS, JSON.stringify(state.homeTools));
    }
  }, [state.homeTools, state.isLoading]);

  // Persist checklist items
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(
        STORAGE_KEYS.CHECKLIST_ITEMS,
        JSON.stringify(state.checklistItems)
      );
    }
  }, [state.checklistItems, state.isLoading]);

  // Persist checklist completions
  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(
        STORAGE_KEYS.CHECKLIST_COMPLETIONS,
        JSON.stringify(state.checklistCompletions)
      );
    }
  }, [state.checklistCompletions, state.isLoading]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
