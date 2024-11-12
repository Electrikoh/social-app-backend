const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
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
