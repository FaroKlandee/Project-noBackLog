using Microsoft.AspNetCore.Mvc;
using NoBacklog.Api.Models;
using NoBacklog.Api.Services.Interfaces;

namespace NoBacklog.Api.Controllers;

[ApiController]
[Route("api/timelogs")]
public class TimeLogsController : ControllerBase
{
    private readonly ITimeLogService _timeLogService;

    public TimeLogsController(ITimeLogService timeLogService)
    {
        _timeLogService = timeLogService;
    }

    // GET /api/timelogs
    // Optional query param: ?cardId=1
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? cardId)
    {
        var timeLogs = await _timeLogService.GetAllTimeLogsAsync(cardId);
        return Ok(new { success = true, data = timeLogs });
    }

    // GET /api/timelogs/:id
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var timeLog = await _timeLogService.GetTimeLogByIdAsync(id);
        if (timeLog is null)
            return NotFound(new { success = false, message = "Time log not found." });

        return Ok(new { success = true, data = timeLog });
    }

    // POST /api/timelogs
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TimeLog timeLog)
    {
        if (timeLog.CardId == 0)
            return BadRequest(new { success = false, message = "Card ID is required." });

        if (timeLog.StartTime == default)
            return BadRequest(new { success = false, message = "Start time is required." });

        try
        {
            var created = await _timeLogService.CreateTimeLogAsync(timeLog);
            return CreatedAtAction(nameof(GetById), new { id = created.Id },
                new { success = true, message = "Time log successfully created.", data = created });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // PUT /api/timelogs/:id
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] TimeLog timeLog)
    {
        try
        {
            var updated = await _timeLogService.UpdateTimeLogAsync(id, timeLog);
            if (updated is null)
                return NotFound(new { success = false, message = "Time log not found." });

            return Ok(new { success = true, message = "Time log successfully updated.", data = updated });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // DELETE /api/timelogs/:id
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _timeLogService.DeleteTimeLogAsync(id);
        if (!deleted)
            return NotFound(new { success = false, message = "Time log not found." });

        return Ok(new { success = true, message = "Time log successfully deleted." });
    }
}