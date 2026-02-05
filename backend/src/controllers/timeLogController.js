const { Card, TimeLog } = require("../models");

/**
 * @desc Create a new time log for a card
 * @route POST /api/timelogs
 * @access public
 */
exports.createTimeLog = async (req, res) => {
	try {
		//Field validation - cardId required
		if (!req.body.cardId || req.body.cardId.trim() === "") {
			return res.status(400).json({
				success: false,
				message: "Card ID is required.",
			});
		}

		//Field validation - startTime required
		if (!req.body.startTime) {
			return res.status(400).json({
				success: false,
				message: "Start time is required.",
			});
		}

		//Validate startTime is a valid date
		const startTime = new Date(req.body.startTime);
		if (isNaN(startTime.getTime())) {
			return res.status(400).json({
				success: false,
				message: "Start time must be a valid date.",
			});
		}

		//Validate endTime is after startTime if provided
		if (req.body.endTime) {
			const endTime = new Date(req.body.endTime);
			if (isNaN(endTime.getTime())) {
				return res.status(400).json({
					success: false,
					message: "End time must be a valid date.",
				});
			}
			if (endTime <= startTime) {
				return res.status(400).json({
					success: false,
					message: "End time must be after start time.",
				});
			}
		}

		//Reference validation - cardId must exist
		const card_exist = await Card.findById(req.body.cardId);
		if (!card_exist) {
			return res.status(404).json({
				success: false,
				message: "Card not found in database.",
			});
		}

		//Auto-calculate duration if endTime is provided
		const timeLogData = { ...req.body };
		if (req.body.endTime) {
			const endTime = new Date(req.body.endTime);
			timeLogData.duration = endTime.getTime() - startTime.getTime();
		}

		//Create the time log
		const timeLog = await TimeLog.create(timeLogData);

		//Return success response
		res.status(201).json({
			success: true,
			message: "Time log successfully created.",
			data: timeLog,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * @desc GET all time logs with optional filtering
 * @route GET /api/timelogs
 * @access public
 */
exports.getAllTimeLogs = async (req, res) => {
	try {
		//Extract the query parameter of the card from the URL
		const cardId = req.query.cardId;
		//Ternary operator to check if cardId exists (truthy) else return whole doc (falsy)
		const filter = cardId ? { cardId: cardId } : {};
		//Find method using the applied filter. Return success.
		const timeLogs = await TimeLog.find(filter).populate("cardId");
		return res.status(200).json({
			success: true,
			count: timeLogs.length,
			data: timeLogs,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * @desc GET time log by id
 * @route GET /api/timelogs/:id
 * @access public
 */
exports.getTimeLogById = async (req, res) => {
	try {
		//Extract time log Id from the URL
		const timeLogId = req.params.id;
		//Find time log using findById
		const timeLog = await TimeLog.findById(timeLogId).populate("cardId");
		//Check if result is null
		if (!timeLog) {
			return res.status(404).json({
				success: false,
				message: "Cannot find time log from Id.",
			});
		}
		//If found then return success
		return res.status(200).json({
			success: true,
			data: timeLog,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * @desc PUT update time log
 * @route PUT /api/timelogs/:id
 * @access public
 */
exports.updateTimeLog = async (req, res) => {
	try {
		//Extract the time log ID from the parameter
		const timeLogId = req.params.id;
		const payload = { ...req.body };

		//Validate cardId reference if being updated
		if (req.body.cardId) {
			const card_exist = await Card.findById(req.body.cardId);
			if (!card_exist) {
				return res.status(404).json({
					success: false,
					message: "Card does not exist.",
				});
			}
		}

		//Validate startTime if provided
		if (req.body.startTime) {
			const startTime = new Date(req.body.startTime);
			if (isNaN(startTime.getTime())) {
				return res.status(400).json({
					success: false,
					message: "Start time must be a valid date.",
				});
			}
		}

		//Validate endTime if provided
		if (req.body.endTime) {
			const endTime = new Date(req.body.endTime);
			if (isNaN(endTime.getTime())) {
				return res.status(400).json({
					success: false,
					message: "End time must be a valid date.",
				});
			}
		}

		//Recalculate duration if startTime or endTime changes
		if (req.body.startTime || req.body.endTime) {
			//Fetch existing time log to get current values
			const existingTimeLog = await TimeLog.findById(timeLogId);
			if (!existingTimeLog) {
				return res.status(404).json({
					success: false,
					message: "Time log not found.",
				});
			}

			const startTime = new Date(req.body.startTime || existingTimeLog.startTime);
			const endTime = req.body.endTime
				? new Date(req.body.endTime)
				: existingTimeLog.endTime;

			//Only calculate duration if endTime exists
			if (endTime) {
				if (new Date(endTime) <= startTime) {
					return res.status(400).json({
						success: false,
						message: "End time must be after start time.",
					});
				}
				payload.duration = new Date(endTime).getTime() - startTime.getTime();
			}
		}

		//Find and update time log
		const timeLog = await TimeLog.findByIdAndUpdate(timeLogId, payload, {
			new: true,
			runValidators: true,
		});
		//Check result
		if (!timeLog) {
			return res.status(404).json({
				success: false,
				message: "Time log not found.",
			});
		}
		//Return updated time log
		res.status(200).json({
			success: true,
			message: "Time log successfully updated.",
			data: timeLog,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

/**
 * @desc DELETE time log
 * @route DELETE /api/timelogs/:id
 * @access public
 */
exports.deleteTimeLog = async (req, res) => {
	try {
		//Extract time log id from params
		const timeLogId = req.params.id;
		//Find time log by id and delete
		const timeLog = await TimeLog.findByIdAndDelete(timeLogId);
		//Check if time log is deleted
		if (!timeLog) {
			return res.status(404).json({
				success: false,
				message: "Time log not found.",
			});
		}
		//Return success
		res.status(200).json({
			success: true,
			message: "Time log successfully deleted.",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};
