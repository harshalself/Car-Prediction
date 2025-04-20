from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import pickle
import pandas as pd
import numpy as np

app = Flask(__name__)
cors = CORS(app)
model = pickle.load(open('./models/LinearRegressionModel.pkl', 'rb'))
car = pd.read_csv('./data/Cleaned_Car_data.csv')

@app.route('/predict', methods=['POST'])
@cross_origin()
def predict():
    try:
        data = request.get_json()
        
        company = data['company']
        car_model = data['car_models']
        year = int(data['year'])
        fuel_type = data['fuel_type']
        driven = int(data['kilo_driven'])

        prediction = model.predict(pd.DataFrame(
            columns=['name', 'company', 'year', 'kms_driven', 'fuel_type'],
            data=np.array([car_model, company, year, driven, fuel_type]).reshape(1, 5)
        ))

        return jsonify(float(np.round(prediction[0], 2)))

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)