const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  chat_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true,
  },
  channel_name: { type: String, required: true },
  channel_type: {
    type: String,
    enum: ["text", "voice"],
    required: true,
  },
  created_at: { type: Date, default: Date.now },
});

const Channel = mongoose.model("Channel", channelSchema);

module.exports = Channel;
