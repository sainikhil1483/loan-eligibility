# 💰 Loan Eligibility Prediction System

A Machine Learning-based web application that predicts whether a loan application is likely to be approved based on financial and personal information. The system analyzes multiple parameters such as income, loan amount, employment type, credit history, and property area to provide intelligent loan eligibility predictions.

This project combines **Machine Learning and Web Development** using Python, Flask, and Scikit-learn.

---

## 🚀 Features

- Predicts loan approval using Machine Learning
- Uses AdaBoost classifier for prediction
- Data preprocessing pipeline for handling user input
- EMI affordability calculation
- Provides explanations and suggestions for users
- Simple Flask web interface
- Deployment-ready project structure

---

## 🧠 Machine Learning Model

The project uses an **AdaBoost Classifier** trained on loan application data.

### Input Features

- Applicant Income
- Co-applicant Income
- Loan Amount
- Loan Amount Term
- Interest Rate
- Credit History
- Employment Type
- Work Experience
- Property Area

The system also includes a **data preprocessing pipeline** that transforms user inputs before making predictions.

---

## 💳 EMI Affordability Check

Along with the machine learning prediction, the system also performs an EMI affordability check.

Steps:

1. Calculate monthly EMI
2. Compare EMI with total monthly income
3. Reject loans if EMI is too high compared to income

This ensures the loan decision is more realistic.

---

## 📂 Project Structure

```
loan-eligibility/
│
├── app.py
├── model.joblib
├── pipeline.joblib
├── requirements.txt
├── Procfile
│
├── templates/
│   └── index.html
│
├── static/
│
└── README.md
```

---

## ⚙️ Installation

### Clone the repository

```
git clone https://github.com/sainikhil1483/loan-eligibility.git
cd loan-eligibility
```

### Install dependencies

```
pip install -r requirements.txt
```

### Run the application

```
python app.py
```

Open in browser:

```
http://127.0.0.1:5000
```

---

## 🖥️ Application Screenshots

### Home Page

(Add screenshot here)

### Prediction Result

(Add screenshot here)

---

## 🛠️ Technologies Used

- Python
- Flask
- Pandas
- NumPy
- Scikit-learn
- Joblib
- HTML
- CSS

---

## 🔮 Future Improvements

- Add advanced machine learning models
- Improve UI with Bootstrap or React
- Add database integration
- Deploy on cloud platforms

---

## 👨‍💻 Author

**Sai Nikhil**

GitHub:  
https://github.com/sainikhil1483

---

⭐ If you like this project, please star the repository!thub.com/sainikhil1483
