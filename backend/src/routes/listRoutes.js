const express = require("express");
const router = express.Router();
const {
	createList,
	getAllLists,
	getListById,
	updateList,
	deleteList
} = require("../controllers/listController");

router.route("/").get(getAllLists).post(createList);
router.route("/:id").get(getListById).put(updateList).delete(deleteList);

module.exports = router;
