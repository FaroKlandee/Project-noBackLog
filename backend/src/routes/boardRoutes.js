const express = require("express");
const router = express.Router();
const {
  createBoard,
  getAllBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
} = require("../controllers/boardController");

router.route("/").get(getAllBoards).post(createBoard);

router.route("/:id").get(getBoardById).put(updateBoard).delete(deleteBoard);

module.exports = router;
