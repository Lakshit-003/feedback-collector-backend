const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs").promises;

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? ["https://your-netlify-site.netlify.app"] // Replace with your Netlify URL
      : ["http://localhost:5173", "http://localhost:3000"],
  methods: "GET,POST",
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Data storage setup
let feedbacks = [];
let nextId = 1;
const dataFile = path.join(__dirname, "data", "feedback.json");

// Data directory management
const ensureDataDir = async () => {
  const dataDir = path.join(__dirname, "data");
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
    if (err.code !== "EEXIST") {
      console.error("Error creating data directory:", err);
      throw err;
    }
  }
};

// Data loading
const loadData = async () => {
  try {
    await ensureDataDir();
    const data = await fs.readFile(dataFile, "utf8");
    const { feedbacks: storedFeedbacks, nextId: storedNextId } =
      JSON.parse(data);
    feedbacks = storedFeedbacks;
    nextId = storedNextId;
    console.log("Data loaded from file");
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("No existing data file, starting fresh");
    } else {
      console.error("Error loading data:", err);
    }
  }
};

// Data saving
const saveData = async () => {
  try {
    await ensureDataDir();
    const data = JSON.stringify({ feedbacks, nextId }, null, 2);
    await fs.writeFile(dataFile, data, "utf8");
    console.log("Data saved successfully");
  } catch (err) {
    console.error("Error saving data:", err);
    throw err;
  }
};

// Initialize data
loadData().catch((err) => {
  console.error("Failed to initialize data:", err);
  process.exit(1);
});

// API Endpoints
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Create new feedback
    const newFeedback = {
      id: nextId++,
      name,
      email,
      message,
      timestamp: new Date().toISOString(),
    };

    feedbacks.push(newFeedback);
    await saveData();

    res.status(201).json(newFeedback);
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

app.get("/api/feedback", (req, res) => {
  res.json(feedbacks);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Optional: Serve frontend in production (only if needed)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
