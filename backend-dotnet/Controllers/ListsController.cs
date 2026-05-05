using Microsoft.AspNetCore.Mvc;
using NoBacklog.Api.Models;

using NoBacklog.Api.Services.Interfaces;

namespace NoBacklog.Api.Controllers;

[ApiController]
[Route("api/lists")]
public class ListsController : ControllerBase
{
    private readonly IListService _listService;

    public ListsController(IListService listService)
    {
        _listService = listService;
    }

    // GET /api/lists
    // Optional query param: ?boardId=1
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? boardId)
    {
        var lists = await _listService.GetAllListsAsync(boardId);
        return Ok(new { success = true, data = lists });
    }

    // GET /api/lists/:id
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var list = await _listService.GetListByIdAsync(id);
        if (list is null)
            return NotFound(new { success = false, message = "List not found." });

        return Ok(new { success = true, data = list });
    }

    // POST /api/lists
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] List list)
    {
        if (string.IsNullOrWhiteSpace(list.Name))
            return BadRequest(new { success = false, message = "List name is required." });

        if (list.BoardId == 0)
            return BadRequest(new { success = false, message = "Board ID is required." });

        try
        {
            var created = await _listService.CreateListAsync(list);
            return CreatedAtAction(nameof(GetById), new { id = created.Id },
                new { success = true, message = "List successfully created.", data = created });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    // PUT /api/lists/:id
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] List list)
    {
        if (string.IsNullOrWhiteSpace(list.Name))
            return BadRequest(new { success = false, message = "List name is required." });

        try
        {
            var updated = await _listService.UpdateListAsync(id, list);
            if (updated is null)
                return NotFound(new { success = false, message = "List not found." });

            return Ok(new { success = true, data = updated });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    // DELETE /api/lists/:id
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _listService.DeleteListAsync(id);
        if (!deleted)
            return NotFound(new { success = false, message = "List not found." });

        return Ok(new { success = true, message = "List successfully deleted." });
    }

    // PATCH /api/lists/reorder
    // Receives an ordered array of { id, position } items and persists
    // the new position values in a single SaveChangesAsync call.
    [HttpPatch("reorder")]
    public async Task<IActionResult> Reorder([FromBody] int[] orderedIds)
    {
        if (orderedIds is null || orderedIds.Length == 0)
            return BadRequest(new { success = false, message = "Reorder payload cannot be empty." });

        try
        {
            await _listService.ReorderListsAsync(orderedIds);
            return Ok(new { success = true, message = "Lists reordered successfully." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }
}