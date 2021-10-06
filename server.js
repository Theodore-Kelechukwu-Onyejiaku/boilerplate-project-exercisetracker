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

const Log = mongoose.model(
  "Log",
  new mongoose.Schema({
    userid: String,
    username: String,
    description: String,
    duration: Number,
    date: { type: Date, default: Date.now },
  })
);

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
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
    let allUsers = await User.find({});
    res.json(allUsers);
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post("/api/users/:id/exercises", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.end("not found");
    }

    const log = new Log({
      userid: req.params.id,
      username: user.username,
      description: req.body.description,
      duration: Number(req.body.duration),
      date: new Date(req.body.date).toDateString(),
    });

    await log.save();

    res.json({
      username: log.username,
      description: log.description,
      duration: log.duration,
      date: new Date(log.date).toDateString(),
      _id: req.params.id,
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/api/users/:id/logs", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (req.query.from && req.query.to && req.query.limit) {
    const log = await Log.find({
      date: { $gte: new Date(req.query.from), $lte: new Date(req.query.to) },
    }).select("-_id -userid -__v");

    console.log(log.length, Number(req.query.limit));
    let limitedLog = log.slice(0, Number(req.query.limit));
    console.log(limitedLog.length);
    let whatever = limitedLog.map((each) => {
      return {
        description: "ekskdks",
        duration: each.duration,
        date: new Date(each.date).toDateString(),
      };
    });

    res.json({
      _id: req.params.id,
      username: user.username,
      count: whatever.length,
      log: whatever,
    });
  } else {
    const log = await Log.find({ userid: req.params.id }).select(
      "-_id -userid"
    );
    const count = log.length;
    let whatever = log.map((each) => {
      return {
        description: "ekskdks",
        duration: each.duration,
        date: new Date(each.date).toDateString(),
      };
    });

    res.json({
      _id: req.params.id,
      username: user.username,
      count: count,
      log: whatever,
    });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
