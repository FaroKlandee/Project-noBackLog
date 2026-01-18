const { Board, List } = require("../models");

/**
 * @desc Create a new list if there is no duplicate one.
 * @route /api/lists
 * @access public
 */
exports.createList = async (req, res) => {
  try {
    // Validate name field exists and isn't empty
    if (!req.body.name || req.body.name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "List name is required.",
      });
    }

    // Validate boardId field exists and isn't empty
    if (!req.body.boardId || req.body.boardId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Board ID is required",
      });
    }

    // Verify the board actually exists in database
    const board_exist = await Board.findById(req.body.boardId);
    if (!board_exist) {
      return res.status(404).json({
        success: false,
        message: "Board not found.",
      });
    }

    // Create the list (validation passed)
    const list = await List.create(req.body);

    // Return success response with created list
    res.status(201).json({
      success: true,
      message: "List successfully created.",
      data: list,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc GET all lists with optional filtering
 * @route api/list/
 * @access public
 */
exports.getAllLists = async (req, res) => {
  try {
    //Extract the query parameter from the URL (/api/lists?boardId=123)
    const boardId = req.query.boardId;
    //Ternary operation if boardId is truthy : falsy
    const filter = boardId ? { boardId: boardId } : {};
    //find method using the applied filter in the database. Return success regardless of match or null
    const lists = await List.find(filter).populate("boardId");
    return res.status(200).json({
      success: true,
      count: lists.length,
      data: lists,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc GET list by id
 * @route api/list/:id
 * @access public
 */
exports.getListById = async (req, res) => {
  try {
    //Extract id from the URL
    const listId = req.params.id;
    //find list by Id
    const list = await List.findById(listId).populate('boardId');
    //Check if result is null
    if (!list) {
      return res.status(404).json({
        success: false,
        message: "list not found",
      });
    }
    //If passed return list
    return res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc PUT updateList
 * @route /api/list/:id
 * @access public
 */
exports.updateList = async (req, res) => {
	try {
		//Extract list id from params
		let list_Id = req.params.id;
		//Extract the data pending update
		let payload = req.body;
		//Validation on content
		if (req.body.name && req.body.name.trim() === "") {
			return res.status(400).json({
				success: false,
				message: "Empty body",
			});
		}
		//If boardId is being updated, verify it exists
		if (req.body.boardId) {
			const board_exist = await Board.findById(req.board.boardId);
			if (!board_exist) {
				return res.status(404).json({
					success: false,
					message: "Board not found",
				});
			}
		}
		//Find and update list using findByIdAndUpdate(id, data, (options))
		// Added function to handle error and success
		const list = await List.findByIdAndUpdate(list_Id, payload, {
			new: true,
			runValidators: true,
		});
		//Then check result
		if (!list) {
			res.status(404).json({
				success: false,
				message: "List not found.",
			});
		}
		//Return updated list
		res.status(200).json({
			success: true,
			message: "List successfully updated.",
			data: list,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * @desc DELET list by id
 * @route /api/list/:id
 * @access public
 */
exports.deleteList = async (req, res) => {
	try {
		//Extract list id from params
		let list_Id = req.params.id;
		//Find list by id and delete using findByIdAndDelete function
		const list = await List.findByIdAndDelete(list_Id);
		//Check if list is deleted
		if (!list) {
			return res.status(404).json({
				success: false,
				message: "List not found",
			});
		}
		//Return success
		res.status(200).json({
			success: true,
			message: "List successfully deleted",
		});

	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
