from flask import Flask, render_template, request, jsonify
import joblib
import pandas as pd
import os
import math

app = Flask(__name__)

# Load preprocessor and model
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
ct = joblib.load(os.path.join(MODEL_DIR, "preprocessor.joblib"))
ada = joblib.load(os.path.join(MODEL_DIR, "adaboost_model.joblib"))


def calculate_emi(P, annual_rate, n):
    """Calculate EMI using standard formula."""
    r = annual_rate / (12 * 100)
    if r == 0 or n == 0:
        return 0
    emi = P * r * ((1 + r) ** n) / ((1 + r) ** n - 1)
    return emi


def explain_decision(user_input, prediction, emi, emi_ratio, interpret_flag=False):
    """
    Returns (result_text, intro_text, reasons_list, improvements_list)
    Adds EMI-based interpretability on top of model-driven reasoning.
    """
    reasons, improvements = [], []

    # Extract safely
    income = float(user_input.get("ApplicantIncome", 0))
    co_income = float(user_input.get("CoapplicantIncome", 0))
    total_income = income + co_income
    loan_amt = float(user_input.get("LoanAmount", 0))
    exp = float(user_input.get("Years_of_Experience", 0))
    credit = int(user_input.get("Credit_History", 0))
    emp_type = str(user_input.get("Employment_Type", "")).lower()
    area = str(user_input.get("Property_Area", "")).lower()

    # --- Rejection Layer (when EMI exceeds affordability)
    if interpret_flag:
        result_text = "❌ Loan Not Approved"
        intro = (
            "Loan not approved — estimated EMI exceeds safe affordability range "
            "as per your declared income and model risk profile."
        )

        reasons.append(
            f"Estimated EMI is ₹{emi:,.0f}, forming {emi_ratio:.1f}% of your total monthly income ₹{total_income:,.0f}."
        )
        if emi_ratio > 80:
            reasons.append("This exceeds the model’s safe repayment threshold (80% of total income).")
        if credit == 0:
            reasons.append("No prior credit history makes risk evaluation harder for the model.")
        if exp < 1:
            reasons.append(f"Work experience of {exp:.1f} years is below the stable range typically seen in approvals.")
        if emp_type.startswith("self"):
            reasons.append("Self-employed applicants must provide verified, consistent income documentation.")

        improvements = [
            "Reduce loan amount or increase repayment tenure to lower EMI burden.",
            "Add a co-applicant with stable income to share repayment responsibility.",
            "Build credit score by maintaining consistent credit card or small loan repayments.",
            "Reapply after 12+ months of steady employment and income growth."
        ]
        return result_text, intro, reasons, improvements

    # --- Model-Driven Approval Path ---
    if prediction == 1:
        result_text = "✅ Loan Approved"
        intro = "Congratulations — your loan is likely to be approved."

        # EMI explanation (concise, no duplicate frontend print)
        reasons.append(f"Your EMI-to-income ratio ({emi_ratio:.1f}%) is within a manageable range.")

        # Credit history-based explanations
        if credit == 1:
            reasons.append("Strong credit history shows reliable repayment behavior.")
        else:
            # Dataset-driven: approval despite low/no credit history
            reasons.append("No established credit history, but other financial indicators are strong.")
            if total_income >= 60000:
                reasons.append("High combined income supports repayment capacity.")
            if exp >= 5:
                reasons.append(f"{exp} years of experience indicates long-term financial stability.")
            if emp_type.startswith("sal"):
                reasons.append("Salaried employment provides stable monthly income.")
            if area in ["urban", "semiurban"]:
                reasons.append(f"Property located in a favorable {area.title()} area improves loan security.")

        improvements = [
            "Proceed with document verification and final loan offer discussion.",
            "Keep salary slips, ID proof, and bank statements ready for verification.",
            "Review EMI schedule and discuss flexible tenure options with your loan officer."
        ]

    # --- Model-Driven Rejection Path ---
    else:
        result_text = "❌ Loan Not Approved"
        intro = "Loan not approved — model identified risk factors affecting your eligibility."

        if emi_ratio > 60:
            reasons.append(f"EMI forms {emi_ratio:.1f}% of your monthly income, which may strain repayment capacity.")
            improvements.append("Reduce loan amount or extend tenure to lower monthly EMI.")
        if credit == 0:
            reasons.append("Credit history is limited or shows inconsistent repayment patterns.")
            improvements.append("Maintain consistent payments to build a positive credit history.")
        if income < 25000:
            reasons.append(f"Your monthly income ₹{int(income):,} is below the model’s preferred stability range.")
            improvements.append("Increase income or add a co-applicant with steady income.")
        if exp < 2:
            reasons.append(f"Limited work experience ({exp} years) may lower confidence in repayment capacity.")
            improvements.append("Gain more stable work experience before reapplying.")
        if emp_type.startswith("self"):
            reasons.append("Self-employed applicants often face higher scrutiny due to variable income.")
            improvements.append("Provide tax filings or audited business income statements.")
        if not reasons:
            reasons.append("Some parameters did not align with the model’s approval trends.")
            improvements.append("Consult your bank for tailored guidance or alternate loan schemes.")

    return result_text, intro, reasons, improvements


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        # Safe numeric conversion
        data["Years_of_Experience"] = float(data.get("Years_of_Experience", 0))
        data["ApplicantIncome"] = float(data.get("ApplicantIncome", 0))
        data["CoapplicantIncome"] = float(data.get("CoapplicantIncome", 0))
        data["LoanAmount"] = float(data.get("LoanAmount", 0))
        data["Loan_Amount_Term"] = int(data.get("Loan_Amount_Term", 0))
        data["Interest_Rate"] = float(data.get("Interest_Rate", 0))
        data["Credit_History"] = int(data.get("Credit_History", 0))

        # Predict using model
        df = pd.DataFrame([data])
        X_proc = ct.transform(df)
        pred = ada.predict(X_proc)[0]

        # --- EMI-based Realism Layer ---
        P = data["LoanAmount"]
        rate = data["Interest_Rate"]
        n = data["Loan_Amount_Term"]
        total_income = data["ApplicantIncome"] + data["CoapplicantIncome"]

        emi = calculate_emi(P, rate, n)
        emi_ratio = (emi / max(total_income, 1)) * 100

        interpret_flag = emi_ratio > 80  # stricter: reject if EMI > 80% of income
        if interpret_flag:
            pred = 0

        # Generate detailed explanation
        result_text, intro, reasons, improvements = explain_decision(
            data, pred, emi, emi_ratio, interpret_flag
        )

        return jsonify({
            "result": result_text,
            "intro": intro,
            "reasons": reasons,
            "improvements": improvements
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ✅ Render-compatible startup (main fix)
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=True)
