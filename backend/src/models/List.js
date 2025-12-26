const mongoose = require("mongoose");
const { Schema } = mongoose;

const listSchema = new Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

//construct Schema into a model
const List = mongoose.model("List", listSchema);

module.exports = List;
