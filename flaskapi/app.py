from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import pickle
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": os.getenv('FRONTEND_URL', 'http://localhost:3000')}})

# Load model and data
try:
    model_path = os.path.join(os.path.dirname(__file__), 'models', 'LinearRegressionModel.pkl')
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'Cleaned_Car_data.csv')
    
    model = pickle.load(open(model_path, 'rb'))
    car = pd.read_csv(data_path)
    print("✅ Model and data loaded successfully")
except Exception as e:
    print(f"❌ Error loading model or data: {str(e)}")
    raise

@app.route('/predict', methods=['POST'])
@cross_origin()
def predict():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['company', 'car_models', 'year', 'fuel_type', 'kilo_driven']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        company = data['company']
        car_model = data['car_models']
        year = int(data['year'])
        fuel_type = data['fuel_type']
        driven = int(data['kilo_driven'])

        # Create prediction dataframe
        prediction_data = pd.DataFrame(
            columns=['name', 'company', 'year', 'kms_driven', 'fuel_type'],
            data=np.array([car_model, company, year, driven, fuel_type]).reshape(1, 5)
        )

        # Make prediction
        prediction = model.predict(prediction_data)
        
        return jsonify(float(np.round(prediction[0], 2)))

    except ValueError as e:
        return jsonify({"error": f"Invalid input data: {str(e)}"}), 400
    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        return jsonify({"error": "An error occurred while making the prediction"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)