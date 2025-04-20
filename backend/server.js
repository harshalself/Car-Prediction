const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const csv = require("csv-parser");
const fs = require("fs");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Replace hardcoded values with environment variables
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI;
const CSV_FILE_PATH = process.env.CSV_FILE_PATH;
const FLASK_URL = process.env.FLASK_URL;

// Load and process CSV data
let carData = [];
fs.createReadStream(CSV_FILE_PATH)
  .pipe(csv())
  .on("data", (data) => {
    if (data.year) data.year = parseInt(data.year);
    carData.push(data);
  })
  .on("end", () => {
    console.log("✅ CSV data loaded successfully");
  })
  .on("error", (error) => {
    console.error("❌ Error reading CSV file:", error);
  });

// Helper function to get unique sorted values
const getUniqueSorted = (array, key) => {
  return [...new Set(array.map((item) => item[key]))].sort();
};

// Routes for dropdown data
app.get("/api/companies", (req, res) => {
  try {
    if (!carData || carData.length === 0) {
      console.error("❌ Car data is empty or not loaded");
      return res.status(500).json({ error: "Car data not available" });
    }

    const companies = getUniqueSorted(carData, "company");
    companies.unshift("Select Company");
    res.json(companies);
  } catch (error) {
    console.error("❌ Error fetching companies:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

app.get("/api/models/:company", (req, res) => {
  const { company } = req.params;
  const models = carData
    .filter((car) => car.company === company)
    .map((car) => car.name);
  res.json([...new Set(models)].sort());
});

app.get("/api/years", (req, res) => {
  const years = getUniqueSorted(carData, "year");
  res.json(years.reverse());
});

app.get("/api/fuel-types", (req, res) => {
  const fuelTypes = getUniqueSorted(carData, "fuel_type");
  res.json(fuelTypes);
});

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    // Optionally exit the process on connection failure
    // process.exit(1);
  });

// Car prediction schema
const predictionSchema = new mongoose.Schema({
  company: String,
  model: String,
  year: Number,
  fuelType: String,
  kilometers: Number,
  predictedPrice: Number,
  createdAt: { type: Date, default: Date.now },
});

const Prediction = mongoose.model("Prediction", predictionSchema);

// Routes
app.post("/api/predict", async (req, res) => {
  try {
    const { company, model, year, fuelType, kilometers } = req.body;

    const flaskResponse = await axios.post(`${FLASK_URL}/predict`, {
      company,
      car_models: model,
      year,
      fuel_type: fuelType,
      kilo_driven: kilometers,
    });

    const predictedPrice = flaskResponse.data;

    const prediction = new Prediction({
      company,
      model,
      year,
      fuelType,
      kilometers,
      predictedPrice,
    });

    await prediction.save();

    res.json({ predictedPrice });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error predicting price" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
