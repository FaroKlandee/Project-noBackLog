namespace NoBacklog.Api.Models;

/*
 * Request DTO for PUT /api/timelogs/:id — a manual correction of an entry's
 * start and/or end time. Both fields are optional ("null/omitted = leave
 * unchanged", as in CardUpdateRequest). Binding to the TimeLog model instead
 * also let a caller move an entry to another card, sidestepping that card's
 * entry limit, so the card is deliberately not editable here.
 *
 * An entry's end time is only editable once it has one: a running timer is
 * finished through POST /api/timelogs/:id/finish, which stamps the time.
 */
public class TimeLogUpdateRequest
{
    public DateTime? StartTime { get; set; }

    public DateTime? EndTime { get; set; }
}
