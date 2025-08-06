const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const moment = require("moment");
const { protect } = require("./middleware/middleware");

const User = require("./modals/userModal");
const { generateToken } = require("./helper");
const Entry = require("./modals/entryModal");
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    app.listen(5000, () => {
      console.log("Server is running on port 5000");
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
})();

app.post("/register", async (req, res) => {
  try {
    const { userName, password, email, phoneNumber } = req.body;

    // Check if user exists
    if (await User.findOne({ email })) {
      return res.status(400).send("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Store user
    const newUser = new User({
      userName,
      password: hashedPassword,
      email,
      phoneNumber,
    });
    const userDetails = await newUser.save();
    const token = await generateToken(userDetails);
    const normalizedUser = userDetails.toObject();
    setTimeout(() => {
      res.status(201).send({
        message: "user registered successfully",
        ...normalizedUser,
        token,
      });
    }, 3000);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error registering user");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ phoneNumber: email }).lean();
    if (!user) {
      return res.status(400).send("User does not exist");
    }
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send("Invalid password");
    }
    const token = await generateToken(user);
    res.status(201).send({
      message: "login successfully",
      ...user,
      token,
    });
    // Generate token
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).send("Internal server error");
  }
});

app.get("/getLocation", async (req, res) => {
  const { latitude, longitude } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).send("Latitude and longitude are required");
  }
  try {
    const response = await fetch(
      `https://us1.api-bdc.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    const data = await response.json();
    res.status(200).send(data);
  } catch (error) {
    console.error("Error fetching location:", error);
    res.status(500).send("Internal server error");
  }
});

app.post("/checkIn", protect, async (req, res) => {
  const userId = req.user.id;
  const { checkInTime, checkInLocation } = req.body;
  if (!userId || !checkInTime || !checkInLocation) {
    return res.status(400).send("All fields are required");
  }
  try {
    const newEntry = new Entry({
      userId,
      checkInTime,
      checkInLocation,
    });
    const savedEntry = await newEntry.save();
    res.status(201).send(savedEntry);
  } catch (error) {
    console.error("Error creating entry:", error);
    res.status(500).send("Internal server error");
  }
});

app.post("/checkOut", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const checkInId = req.query.checkInId;
    const { checkOutTime, checkoutLocation, totalHurs } = req.body;
    const result = await Entry.findOne({ _id: checkInId, userId });
    if (result) {
      const result = await Entry.findByIdAndUpdate(
        { _id: checkInId },
        {
          $set: {
            checkoutLocation: checkoutLocation,
            totalHurs: totalHurs,
            checkOutTime: checkOutTime,
          },
        },
        { new: true }
      );
      if (result) {
        return res
          .status(201)
          .send({ message: "checkout successfully", data: result });
      }
    } else {
      console.log("No check-in found for today");
    }
  } catch (error) {
    console.error("Error checkout entry:", error);
    res.status(500).send("Internal server error");
  }
});

app.get("/allEntry", protect, async (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count of documents for pagination info
    const total = await Entry.countDocuments();

    // Fetch paginated data with population
    const entries = await Entry.find()
      .populate("userId")
      .skip(skip)
      .limit(limit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      data: entries,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        hasMore,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
