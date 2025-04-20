import { useState, useEffect } from "react";
import "./App.css";

const EXPRESS_URL = import.meta.env.VITE_EXPRESS_URL;
const FLASK_URL = import.meta.env.VITE_FLASK_URL;

function App() {
  const [formData, setFormData] = useState({
    company: "",
    model: "",
    year: "",
    fuelType: "",
    kilometers: "",
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [carModels, setCarModels] = useState([]);
  const [years, setYears] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        console.log("Fetching data from:", `${EXPRESS_URL}/api/companies`);
        const companiesRes = await fetch(`${EXPRESS_URL}/api/companies`);

        if (!companiesRes.ok) {
          throw new Error(`HTTP error! status: ${companiesRes.status}`);
        }

        const companies = await companiesRes.json();
        console.log("Received companies:", companies);

        if (!Array.isArray(companies)) {
          throw new Error("Companies data is not an array");
        }

        setCompanies(companies);

        // Fetch other dropdown data
        const [yearsRes, fuelTypesRes] = await Promise.all([
          fetch(`${EXPRESS_URL}/api/years`),
          fetch(`${EXPRESS_URL}/api/fuel-types`),
        ]);

        const years = await yearsRes.json();
        const fuelTypes = await fuelTypesRes.json();

        setYears(years);
        setFuelTypes(fuelTypes);
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
        setError(`Failed to load dropdown data: ${error.message}`);
      }
    };

    fetchDropdownData();
  }, []);

  useEffect(() => {
    const fetchCarModels = async () => {
      if (formData.company && formData.company !== "Select Company") {
        try {
          const response = await fetch(
            `${EXPRESS_URL}/api/models/${formData.company}`
          );
          const models = await response.json();
          setCarModels(models);
        } catch (error) {
          console.error("Error fetching car models:", error);
          setError("Failed to load car models");
        }
      } else {
        setCarModels([]);
      }
    };

    fetchCarModels();
  }, [formData.company]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${FLASK_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company: formData.company,
          car_models: formData.model,
          year: parseInt(formData.year),
          fuel_type: formData.fuelType,
          kilo_driven: parseInt(formData.kilometers),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Prediction failed");
      }

      const predictedPrice = await response.json();
      setPrediction(predictedPrice);

      await fetch(`${EXPRESS_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          predictedPrice,
        }),
      });
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Error predicting price");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container">
      <div className="glass-card">
        <h1 className="title">Car Price Predictor</h1>
        <p className="subtitle">Get an instant estimate for your car's value</p>

        <form onSubmit={handleSubmit} className="prediction-form">
          <div className="form-group">
            <label>Select Company</label>
            <select
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="form-select">
              <option value="">Select a company</option>
              {Array.isArray(companies) &&
                companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Select Model</label>
            <select name="model" value={formData.model} onChange={handleChange}>
              <option value="">Select a model</option>
              {carModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Year of Purchase</label>
            <select name="year" value={formData.year} onChange={handleChange}>
              <option value="">Select year</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Fuel Type</label>
            <select
              name="fuelType"
              value={formData.fuelType}
              onChange={handleChange}>
              <option value="">Select fuel type</option>
              {fuelTypes.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {fuel}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Kilometers Driven</label>
            <input
              type="number"
              name="kilometers"
              value={formData.kilometers}
              onChange={handleChange}
              placeholder="Enter kilometers driven"
            />
          </div>

          <button type="submit" className="predict-button" disabled={loading}>
            {loading ? "Predicting..." : "Predict Price"}
          </button>

          {prediction !== null && (
            <div className="prediction-result">
              <h3>Predicted Price:</h3>
              <p className="predicted-price">₹{prediction.toLocaleString()}</p>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default App;
