const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  chat_name: { type: String, required: true },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  created_at: { type: Date, default: Date.now },
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
