const mongoose = require("mongoose");

const banSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  channel_id: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" }, // optional if it's a global ban
  banned_at: { type: Date, default: Date.now },
});

const Ban = mongoose.model("Ban", banSchema);

module.exports = Ban;
