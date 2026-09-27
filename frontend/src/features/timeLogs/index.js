/**
 * @fileoverview Public barrel file for the timeLogs feature module.
 *
 * This is the single, authoritative entry point through which all other parts
 * of the application should import anything related to time logs. Following the
 * barrel-file pattern keeps imports short and decoupled from internal folder
 * structure — consumers never need to know whether something lives in `api/`,
 * `hooks/`, or `components/`; they simply import from `features/timeLogs`.
 *
 * Example usage from another module:
 *   import { TimeLogSection } from '../../timeLogs';
 *
 * Exported surface:
 *   getTimeLogsByCard, getTimeLogSettings,
 *   startTimeLog, finishTimeLog, deleteTimeLog — raw async HTTP functions
 *                                                 (timeLogService.js)
 *   useCardTimeLogs  — hook: one card's time logs + the server's entry limit,
 *                      with start/finish/remove mutations
 *   formatDuration, formatClock, formatTime — display formatters
 *   TimeLogSection   — component: the "Time tracking" section rendered inside
 *                      the card detail dialog (CardEditDialog)
 *
 * @module features/timeLogs
 */

/* API service layer — raw async functions for the /api/timelogs resource. */
export * from './api/timeLogService';

/* Hooks — React hooks that wrap the service layer with local state management. */
export * from './hooks/useCardTimeLogs';

/* Utils — pure display formatters. */
export * from './utils/formatDuration';

/* Components — presentational components for the timeLogs feature. */
export { default as TimeLogSection } from './components/TimeLogSection';
