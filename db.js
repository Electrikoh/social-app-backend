require("dotenv").config();
const mongoose = require("mongoose");

const user = process.env.ROOT_USER;
const password = process.env.ROOT_PASSWORD;
const myIp = process.env.SERVER_IP;
const myPort = process.env.SERVER_PORT;

const mongoURL = `mongodb://${user}:${password}@${myIp}:${myPort}/chat_app?authSource=admin`;

mongoose
  .connect(mongoURL, {})
  .then(() => console.log("Connected to MongoDB with Mongoose!"))
  .catch((err) => console.error("MongoDB connection error:", err));
