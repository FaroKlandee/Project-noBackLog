const mongoose = require("mongoose");

const { Schema } = mongoose;

const boardSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
  },
  {
    timestamps: true,
  },
);

const Board = mongoose.model("Board", boardSchema);

module.exports = Board;
