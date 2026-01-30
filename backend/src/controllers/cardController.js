const { List, Card } = require("../models");

/**
 * @desc Create a new card in list
 * @route /api/cards
 * @access public
 */
exports.createCard = async (req, res) => {
	//Field validation (title required, listId required)
//Reference validation (listId must exist in Lists collection)
//Position handling (defaults to end of list if not specified)
	try {
		//Field validation
		if (!req.body.title || req.body.title.trim() === "") {
			return res.status(400).json({
				success: false,
				message: "Card title is required",
			});
		}

		//Validate listId
		if (!req.body.listId || req.body.listId.trim() === "") {
			return res.status(400).json({
				success: false,
				message: "List ID is required",
			});
		}

		//Validate list existence
		const list_exist = await List.findById(req.body.listId);
		if (!list_exist) {
			return res.status(404).json({
				success: false,
				message: "List not found in database."
			});
		}

		//Create the card if passed
		const card = await Card.create(req.body);

		//Retrun success response with created Card.
		res.status(201).json({
			success: true,
			message: "Card successfully created.",
			data: card,
		});

	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * @desc GET all cards with optional filtering
 * @route /api/cards/
 * @access public
 */
exports.getAllCards = async (req, res) => {
	try {
		//Extract the query parameter of the list from the URL
		const listId = req.query.listId;
		//Ternary operator to check if listId exists (truthy) else return whole doc (falsy)
		const filter = listId ? { listId : listId } : {};
		//Find method using hte applied filter. Return success.
		const cards = await Card.find(filter).populate("listId");
		return res.status(200).json({
			success: true,
			count: cards.length,
			data: cards,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * @desc GET cards by id
 * @route /api/cards/:id
 * @access public
 */
exports.getCardById = async (req, res) => {
	try {
		//Extract card Id from the URL
		const cardId = req.params.id;
		//Find card using findById
		const card = await Card.findById(cardId).populate('listId');
		//Check if result is null
		if (!card) {
			return res.status(404).json({
				success: false,
				message: "Cannot find card from Id",
			});
		}
		//If found the return success
		return res.status(200).json({
			success: true,
			data: card,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * @desc PUT update card
 * @route /api/cards/:id
 * @access public
 */
exports.updateCard = async (req, res) => {
	try {
		//Extract the card ID from the parameter query
		let card_Id = req.params.id;
		//Extract the title pending update
		let payload = req.body;
		//If there is a title pending update
		if (req.body.title && req.body.title.trim() === "") {
			return res.status(400).json({
				success: false,
				message: "Empty title",
			});
		}
		//Validate listId reference if being updated
		if (req.body.listId) {
			const list_exist = await List.findById(req.body.listId);
			if (!list_exist) {
				return res.status(404).json({
					success: false,
					message: "List does not exist.",
				});
			}
		}
		//Find and update card using findByIdAndUpdate(id, data, (options))
		// Added function to handle error and success
		const card = await Card.findByIdAndUpdate(card_Id, payload, {
			new: true,
			runValidators: true,
		});
		//Then check result
		if (!card) {
			return res.status(404).json({
				success: false,
				message: "Card not found.",
			});
		}
		//Return updated list
		res.status(200).json({
			success: true,
			message: "Card successfully updated.",
			data: card,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * @desc DELETE card
 * @route /api/cards/:id
 * @access public
 */
exports.deleteCard = async (req, res) => {
	try {
		//Extract list id from params
		let card_Id = req.params.id;
		//Find list by id and delete using findByIdAndDelete function
		const card = await Card.findByIdAndDelete(card_Id);
		//Check if list is deleted
		if (!card) {
			return res.status(404).json({
				success: false,
				message: "Card not found",
			});
		}
		//Return success
		res.status(200).json({
			success: true,
			message: "Card successfully deleted",
		});

	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
