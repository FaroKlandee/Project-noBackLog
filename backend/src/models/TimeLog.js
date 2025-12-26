const mongoose = require("mongoose");
const { Schema } = mongoose;

const timeLogSchema = new Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

//construct Schema into a model
const TimeLog = mongoose.model("TimeLog", timeLogSchema);

module.exports = TimeLog;
