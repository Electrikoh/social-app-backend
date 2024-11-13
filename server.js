("use strict");
require("dotenv").config();

const express = require("express");

const http = require("http"); // Import http to create a server
const WebSocket = require("ws");

const mongoose = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Message = require("./models/Message");
const User = require("./models/User");
const { body, validationResult } = require("express-validator");
const cors = require("cors");
const Chat = require("./models/Group");
const Channel = require("./models/Channel");
const Group = require("./models/Group");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const frontendURL = process.env.FRONTEND_URL;
const websocketPort = 3002; // mora da bide razlicno od backend port poradi skill issue

app.use(
  cors({
    origin: frontendURL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

const wss = new WebSocket.WebSocketServer({ port: websocketPort });

wss.broadcast = function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");
  ws.on("message", (msg) => {
    console.log("Received message:", msg);
    // Parse and broadcast the message
    const parsedMessage = JSON.parse(msg);
    wss.broadcast(parsedMessage);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});
//register
app.post(
  "/api/register",
  [
    body("username")
      .isLength({ min: 3 })
      .withMessage("Username must be at least 3 characters"),
    body("password")
      .isLength({ min: 5 })
      .withMessage("Password must be at least 5 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({ username, password: hashedPassword });
      await user.save();

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  }
);
// login
app.post(
  "/api/login",
  [body("username").not().isEmpty(), body("password").not().isEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, rememberMe } = req.body;

    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      // Set expiration based on rememberMe flag
      const tokenExpiry = rememberMe ? "7d" : "8h";

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
        expiresIn: tokenExpiry,
      });

      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  }
);
// add this to all routes to auth people
const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
// Add someone to a group
app.post("/api/groups/:groupId/invite", authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const inviteeUsername = req.body.invitee;
  const userId = req.user.userId;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.owner_id.toString() !== userId) {
      return res.status(403).json({
        error: "You do not have permission to invite users to this group",
      });
    }

    const invitee = await User.findOne({ username: inviteeUsername });

    if (!invitee) {
      return res.status(404).json({ error: "Invitee not found" });
    }

    const inviteeId = invitee._id;

    if (!group.users.includes(inviteeId)) {
      group.users.push(inviteeId);
      console.log(`User ${inviteeUsername} invited to group.`);
      await group.save();
      res.status(200).json({ message: "User invited successfully" });
    } else {
      res.status(400).json({ error: "User is already in the group" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error inviting user to group" });
  }
});
// Create a new group
app.post("/api/groups/new", authMiddleware, async (req, res) => {
  const { group_name } = req.body;
  const userId = req.user.userId;

  try {
    const group = new Group({
      group_name,
      owner_id: userId,
    });
    await group.save();

    const channel = new Channel({
      group_id: group._id,
      channel_name: "chat",
      channel_type: "text",
    });

    await channel.save();
    res.status(201).json({ message: "Group created successfully", group });
  } catch (error) {
    res.status(500).json({ error: "Error creating group" });
  }
});
// Get all groups you're in
app.get("/api/groups", authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const groups = await Group.find({
      $or: [{ owner_id: userId }, { users: userId }],
    });

    if (!groups.length) {
      return res.status(404).json({ error: "No groups found" });
    }

    res.status(200).json({ groups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching groups" });
  }
});
// Create a channel in a group
app.post("/api/groups/:groupId/new", authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { channel_name, channel_type } = req.body;

  try {
    const channel = new Channel({
      group_id: groupId,
      channel_name,
      channel_type,
    });

    await channel.save();
    res.status(201).json({ message: "Channel created successfully", channel });
  } catch (error) {
    res.status(500).json({ error: "Error creating channel" });
  }
});
// Get channels in a group
app.get("/api/groups/:groupId", authMiddleware, async (req, res) => {
  const { groupId } = req.params;

  try {
    const channels = await Channel.find({ group_id: groupId });

    if (!channels.length) {
      return res.status(404).json({ error: "No channels found" });
    }

    res.status(200).json({ channels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching channels" });
  }
});
// Get messages in a channel
app.get("/api/groups/:groupId/:channelId", authMiddleware, async (req, res) => {
  const { groupId, channelId } = req.params;

  try {
    const messages = await Message.find({ channel: channelId })
      .populate("sender", "username")
      .sort({ timestamp: 1 });

    if (!messages.length) {
      return res
        .status(404)
        .json({ error: "No messages found in this channel" });
    }

    res.status(200).json({ messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching messages" });
  }
});
// Send a message in a channel
app.post(
  "/api/groups/:groupId/:channelId",
  authMiddleware,
  async (req, res) => {
    const { chatId, channelId } = req.params;
    const { content } = req.body; // The message content from the client
    const senderId = req.user.userId; // Get the sender's userId from the token

    try {
      // Ensure the channel exists
      const channel = await Channel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      // Create a new message
      const newMessage = await new Message({
        content,
        sender: senderId,
        channel: channelId,
      }).save();

      const messageWithSender = await Message.findById(newMessage._id).populate(
        "sender",
        "username"
      );
      wss.broadcast({ message: messageWithSender });

      res.status(201).json({ message: "Message sent successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error sending message" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
