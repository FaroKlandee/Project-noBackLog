/**
 * @file constants.js
 * @description Shared constants for the cards feature.
 */

/**
 * Card priority levels, ascending urgency. Mirrors the backend `Priority`
 * enum, which serialises to these exact strings via `JsonStringEnumConverter`
 * (backend-dotnet/Program.cs).
 */
export const PRIORITIES = ['Low', 'Medium', 'High'];

export const DEFAULT_PRIORITY = 'Medium';
