using Microsoft.AspNetCore.Mvc;
using NoBacklog.Api.Models;
using NoBacklog.Api.Services.Interfaces;

namespace NoBacklog.Api.Controllers;

[ApiController]
[Route("api/boards")]
public class BoardsController : ControllerBase
{
    private readonly IBoardService _boardService;

    public BoardsController(IBoardService boardService)
    {
        _boardService = boardService;
    }

    // GET /api/boards
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var boards = await _boardService.GetAllBoardsAsync();
        return Ok(new { success = true, data = boards });
    }

    // GET /api/boards/:id
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var board = await _boardService.GetBoardByIdAsync(id);
        if (board is null)
            return NotFound(new { success = false, message = "Board not found." });

        return Ok(new { success = true, data = board });
    }

    // POST /api/boards
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Board board)
    {
        if (string.IsNullOrWhiteSpace(board.Name))
            return BadRequest(new { success = false, message = "Board name is required." });

        var created = await _boardService.CreateBoardAsync(board);
        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            new { success = true, message = "Board successfully created.", data = created });
    }

    // PUT /api/boards/:id
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Board board)
    {
        if (string.IsNullOrWhiteSpace(board.Name))
            return BadRequest(new { success = false, message = "Board name is required." });

        var updated = await _boardService.UpdateBoardAsync(id, board);
        if (updated is null)
            return NotFound(new { success = false, message = "Board not found." });

        return Ok(new { success = true, data = updated });
    }

    // DELETE /api/boards/:id
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _boardService.DeleteBoardAsync(id);
        if (!deleted)
            return NotFound(new { success = false, message = "Board not found." });

        return Ok(new { success = true, message = "Board successfully deleted." });
    }
}