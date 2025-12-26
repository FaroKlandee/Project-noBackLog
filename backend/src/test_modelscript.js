app.get("/test-models", async (req, res) => {
  try {
    const { Board, List, Card, TimeLog } = require("./models");

    //Create new board
    const board = new Board({
      name: "My first board",
    });
    // save board to DB
    await board.save();

    //create new list with ref to board id
    const list = new List({
      boardId: board._id,
      name: "Backlog",
      position: 0,
    });
    //save list to DB
    await list.save();

    //create card with ref to list id
    const card = new Card({
      listId: list._id,
      title: "Fix login bug",
      description: "Users can't login with special characters",
      priority: "high",
    });
    //save card to DB
    await card.save();

    //create new timelog with ref to card id
    const timeLog = new TimeLog({
      cardId: card._id,
      startTime: new Date(),
      endTime: null,
    });
    //save timelog to db
    await timeLog.save();

    //return all created objects upon success
    res.json({
      message: "Test successful",
      data: { board, list, card, timeLog },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: "Check if MongoDB is running and models are correct",
    });
  }
});
