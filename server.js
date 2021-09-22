const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.DB_LOCAL);

const db = mongoose.connection;

db.on("error", () => {
  console.error.bind(console, "MongoDB connection error:");
});

db.on("open", () => {
  console.log("database running successfully");
});

// const Log = new mongoose.Schema({

// })
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
    count: { type: Number, default: 0 },
    log: [
      {
        description: String,
        duration: Number,
        date: { type: Date, default: "2021-09-17" },
      },
    ],
  })
);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  let newUser = new User({
    username: req.body.username,
  });
  try {
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    res.json({
      error: error.message,
    });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    let allUsers = await User.find({}).populate("username _id").exec();
    res.json(allUsers);
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post("/api/users/:id/exercises", async (req, res) => {
  const user = await User.findById(req.params.id).exec();
  console.log(req.body);
  if (!user) {
    res.end("not found");
  }

  user.count = user.count + 1;

  let log = {};
  log.description = req.body.description;
  log.duration = req.body.duration;

  log.date = new Date(req.body.date).toDateString();

  user.log.push(log);

  try {
    await user.save();

    res.json({
      username: user.username,
      description: log.description,
      duration: log.duration,
      date: log.date,
      _id: user._id,
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/api/users/:id/logs", async (req, res) => {
  console.log(req.query);
  if (req.query.from && req.query.to && req.query.limit) {
    let fromDate = new Date(req.query.from).toISOString();
    let toDate = new Date(req.query.to).toISOString();
    let limit = req.query.limit;

    let user = await User.findById(req.params.id).exec();
    let logs = user.log.filter((each) => {
      return (
        each.date.toISOString() >= fromDate && each.date.toISOString() <= toDate
      );
    });

    let limitedArray = logs.slice(0, limit);
    user.log = limitedArray;
    res.json({ user });
  } else {
    let user = await User.findById(req.params.id).exec();
    console.log("hhhe");
    res.json(user);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
