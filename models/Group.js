const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  group_name: { type: String, required: true },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  created_at: { type: Date, default: Date.now },
});

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
