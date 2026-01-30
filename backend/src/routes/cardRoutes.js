const express = require("express");
const router = express.Router();
const {
	createCard,
	getAllCards,
	getCardById,
	updateCard,
	deleteCard,
} = require("../controllers/cardController");

router.route("/").get(getAllCards).post(createCard);
router.route("/:id").get(getCardById).put(updateCard).delete(deleteCard);

module.exports = router;
