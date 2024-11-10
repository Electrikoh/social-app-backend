("use strict");
require("dotenv").config();

const express = require("express");
const mongoose = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Message = require("./models/Message");
const User = require("./models/User");
const { body, validationResult } = require("express-validator");
const cors = require("cors");
const Chat = require("./models/Chat");
const Channel = require("./models/Channel");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const frontendURL = process.env.FRONTEND_URL;

app.use(
  cors({
    origin: frontendURL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

app.post(
  "/api/register",
  [
    body("username").isLength({ min: 3 }),
    body("password").isLength({ min: 5 }),
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
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({ username, password: hashedPassword });
      await user.save();

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

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

app.post("/api/chat", authMiddleware, async (req, res) => {
  const { chat_name } = req.body;
  const userId = req.user.userId;

  try {
    const chat = new Chat({
      chat_name,
      owner_id: userId,
    });
    await chat.save();
    res.status(201).json({ message: "Chat created successfully", chat });
  } catch (error) {
    res.status(500).json({ error: "Error creating chat" });
  }
});

app.get("/api/chat", authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const chats = await Chat.find({ owner_id: userId });

    if (!chats.length) {
      return res.status(404).json({ error: "No chats found" });
    }

    res.status(200).json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching chats" });
  }
});

app.post("/api/chat/:chatId/channel", authMiddleware, async (req, res) => {
  const { chatId } = req.params;
  const { channel_name, channel_type } = req.body;

  try {
    const channel = new Channel({
      chat_id: chatId,
      channel_name,
      channel_type,
    });

    await channel.save();
    res.status(201).json({ message: "Channel created successfully", channel });
  } catch (error) {
    res.status(500).json({ error: "Error creating channel" });
  }
});

app.get("/api/chat/:chatId/channel", authMiddleware, async (req, res) => {
  const { chatId } = req.params;

  try {
    const channels = await Channel.find({ chat_id: chatId });

    if (!channels.length) {
      return res.status(404).json({ error: "No channels found" });
    }

    res.status(200).json({ channels });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching channels" });
  }
});

app.get(
  "/api/chat/:chatId/channel/:channelId",
  authMiddleware,
  async (req, res) => {
    const { chatId, channelId } = req.params;

    try {
      // Find messages for the specified channel
      const messages = await Message.find({ channel: channelId })
        .populate("sender", "username") // Populate sender with username
        .sort({ timestamp: 1 }); // Sort messages by timestamp ascending

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
  }
);

app.post(
  "/api/chat/:chatId/channel/:channelId",
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
      const message = new Message({
        content,
        sender: senderId,
        channel: channelId,
      });

      await message.save();

      res.status(201).json({ message: "Message sent successfully", message });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error sending message" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
