namespace NoBacklog.Api.Models;

/*
 * Server-side time-tracking settings, bound from the "TimeTracking" config
 * section (appsettings / env vars). Defaults live here in code because both
 * appsettings files are gitignored.
 *
 * Both limits are placeholders until a project-manager-facing settings UI
 * exists (which needs auth/roles first).
 *
 *   MaxEntriesPerCard — stored entries per card; a running entry counts toward it.
 *   MaxRunningTimers  — timers running at the same time across ALL cards.
 */
public class TimeTrackingOptions
{
    public const string SectionName = "TimeTracking";

    public int MaxEntriesPerCard { get; set; } = 5;

    public int MaxRunningTimers { get; set; } = 2;
}
