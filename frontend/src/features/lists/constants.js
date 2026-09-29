/**
 * @file constants.js
 * @description Shared constants for the lists feature.
 */

/**
 * Longest list name the backend accepts. Mirrors `[MaxLength(50)]` on
 * `List.Name` (backend-dotnet/Models/List.cs), which rejects anything longer
 * with a 400.
 */
export const LIST_NAME_MAX_LENGTH = 50;
