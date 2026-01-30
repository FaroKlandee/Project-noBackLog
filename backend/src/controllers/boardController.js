const { Board } = require("../models");

/**
 * @desc Create new dashboard
 * @route POST /api/boards
 * @access Public
 */
exports.createBoard = async (req, res) => {
  try {
    //Validation
    if (!req.body.name || req.body.name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Board name is required",
      });
    }
    //Extract data from request body
    //Create new board
    const board = await Board.create(req.body);

    //Status 201 success response
    res.status(201).json({
      success: true,
      message: "Board successfully created",
      data: board,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc Get all created boards
 * @route GET /api/boards
 * @access Public
 */
exports.getAllBoards = async (req, res) => {
  try {
    //create method and assign to board var
    const boards = await Board.find();
    // return success if empty
    if (boards.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }
    // return success if populated
    res.status(200).json({
      success: true,
      count: boards.length,
      data: boards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc Get board by ID
 * @route GET /api/boards/:id
 * @access Public
 */
exports.getBoardById = async (req, res) => {
  try {
    //init var for param.id
    let id = req.params.id
    //run search by ID
    const board = await Board.findById(id);
    // Check if result is null
    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }
    // success if populated
    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc Update board
 * @route PUT /api/boards/:id
 * @access Public
 */
exports.updateBoard = async (req, res) => {
  try {
    //Extract board id from URL params
    let board_Id = req.params.id;
    //Extract data from request body
    let payload = req.body;
    //Validation on req.body
    if (req.body && req.body.name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Empty body",
      });
    }
    //Find and update board using findByIdAndUpdate(id, data, (options))
    // Added function to handle error and success
    const board = await Board.findByIdAndUpdate(board_Id, payload, {
      new: true,
      runvalidators: true,
    });

    // Then check result
    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found.",
      });
    }
    // Return updated Board
    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc Delete board
 * @route DELETE /api/boards
 * @access Public
 */
exports.deleteBoard = async (req, res) => {
  try {
    //Extract board id from URL params
    let board_Id = req.params.id;
    //Find board by id and delete using findByIdAndDelete function
    const board = await Board.findByIdAndDelete(board_Id);
    //Check id found
    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found.",
      });
    }
    //Return success
    res.status(200).json({
      success: true,
      message: "Board deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
