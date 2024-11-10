const mongoose = require("mongoose");

const channelPermissionSchema = new mongoose.Schema({
  channel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Channel",
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },
});

const ChannelPermission = mongoose.model(
  "ChannelPermission",
  channelPermissionSchema
);

module.exports = UserRole;
