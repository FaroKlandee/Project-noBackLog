const express = require("express");
const router = express.Router();
const {
	createTimeLog,
	getAllTimeLogs,
	getTimeLogById,
	updateTimeLog,
	deleteTimeLog,
} = require("../controllers/timeLogController");

router.route("/").get(getAllTimeLogs).post(createTimeLog);
router.route("/:id").get(getTimeLogById).put(updateTimeLog).delete(deleteTimeLog);

module.exports = router;
