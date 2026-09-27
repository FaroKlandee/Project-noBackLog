namespace NoBacklog.Api.Models;

/*
 * Read-only projection for GET /api/timelogs/running — a running timer plus its
 * card's title, so the UI can say which cards are using up the global limit
 * without serialising the whole Card (whose TimeLogs navigation would cycle).
 */
public record RunningTimerSummary(int Id, int CardId, string CardTitle, DateTime StartTime);
