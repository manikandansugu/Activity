const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkInTime: {
      type: String,
      required: true,
    },
    checkOutTime: {
      type: String,
    },
    checkoutLocation: {
      type: String,
    },
    checkInLocation: {
      type: String,
      required: true,
    },
    totalHurs: {
      type: String,
    },
  },
  { timestamps: true }
);

const Entry = mongoose.model("Entry", entrySchema);
module.exports = Entry;
