const mongoose = require("mongoose");

const muteSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  chat_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true,
  },
  channel_id: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" },
  muted_at: { type: Date, default: Date.now },
  mute_duration: { type: Number },
});

const Mute = mongoose.model("Mute", muteSchema);

module.exports = UserRole;
