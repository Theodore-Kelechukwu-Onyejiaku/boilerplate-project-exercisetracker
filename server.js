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

const Log = new mongoose.Schema(
  {
    description: String,
    duration: Number,
    date: { type: Date, default: Date },
  },
  { _id: false }
);
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
    count: { type: Number, default: 0 },
    log: [Log],
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
    let allUsers = await User.aggregate([
      {
        $project: {
          username: 1,
          count: 1,
          log: 1,
        },
      },
    ]);

    allUsers.map((each) => {
      each.log.map((eachLog) => {
        eachLog.date = new Date(eachLog.date).toDateString();
      });
    });
    res.json(allUsers);
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post("/api/users/:id/exercises", async (req, res) => {
  const user = await User.findById(req.params.id).select("-log._id").exec();
  console.log(req.body);
  if (!user) {
    res.end("not found");
  }

  user.count = user.count + 1;

  let log = {};
  log.description = req.body.description;
  log.duration = req.body.duration;

  log.date = req.body.date;

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
    let user = await User.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(req.params.id) } },
      {
        $project: {
          log: {
            $filter: {
              input: "$log",
              as: "log",
              cond: {
                $and: [
                  { $gte: ["$$log.date", new Date(req.query.from)] },
                  { $lte: ["$$log.date", new Date(req.query.to)] },
                ],
              },
            },
          },
          username: 1,
          count: 1,
        },
      },
    ]);
    const ourLimit = Number(req.query.limit);

    user.forEach((eachUser) => {
      eachUser.log.map((eachUserLog) => {
        eachUserLog.date = new Date(eachUserLog.date).toDateString();
      });
    });
    user[0].log.splice(-1, ourLimit);

    res.json(user);
  } else {
    try {
      let user = await User.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(req.params.id) } },
        {
          $project: {
            username: 1,
            count: 1,
            log: 1,
          },
        },
      ]);
      user.map((each) => {
        each.log.map((eachLog) => {
          eachLog.date = new Date(eachLog.date).toDateString();
        });
      });
      console.log(user.length);
      res.json(user);
    } catch (error) {
      res.json({ error: error.message });
    }
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
