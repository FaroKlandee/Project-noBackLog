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
 *   import { createTimeLog, deleteTimeLog } from '../features/timeLogs';
 *
 * As the timeLogs feature grows, new sub-modules (hooks, components, utils,
 * context providers, etc.) should be re-exported here so that the rest of the
 * application always has a single, stable import path to target.
 *
 * @module features/timeLogs
 */

/*
 * API service layer
 * -----------------
 * Re-exports every named export from timeLogService.js, which contains the raw
 * async functions responsible for communicating with the backend REST API
 * (e.g. getAllTimeLogs, getTimeLogById, createTimeLog, updateTimeLog,
 * deleteTimeLog). Consumers that only need to perform direct HTTP operations —
 * such as other hooks, thunks, or one-off utility scripts — can pull these
 * functions straight from this barrel without going deeper into the folder tree.
 */
export * from './api/timeLogService';