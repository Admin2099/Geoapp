import os
import json
import random
from flask import Flask, render_template, jsonify, request
from sqlalchemy import create_engine, text

app = Flask(__name__)

# --- NEW: Define the absolute base directory of the app ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- UPDATED: Use the base directory to create absolute paths for files ---
DB_FILE = os.path.join(BASE_DIR, "capitals.db")
JSON_FILE = os.path.join(BASE_DIR, "capitals.json")

DATABASE_URL = f"sqlite:///{DB_FILE}"

# Create a SQLAlchemy engine
engine = create_engine(DATABASE_URL)

def initialize_database():
    if not os.path.exists(DB_FILE):
        print("Database not found. Creating and populating...")
        try:
            # --- UPDATED: Use the absolute path to open the JSON file ---
            with open(JSON_FILE, 'r', encoding='utf-8') as f:
                capitals_data = json.load(f)
            
            with engine.connect() as connection:
                connection.execute(text("""
                    CREATE TABLE capitals (
                        country TEXT PRIMARY KEY, capital TEXT NOT NULL, lat REAL, lon REAL
                    )
                """))
                for capital in capitals_data:
                    connection.execute(text("""
                        INSERT INTO capitals (country, capital, lat, lon) 
                        VALUES (:country, :capital, :lat, :lon)
                    """), capital)
                connection.commit()
            print("Database initialized successfully.")
        except Exception as e:
            print(f"Error initializing database: {e}")

# Call the initialization function when the app starts
initialize_database()

# --- Your API routes are unchanged ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/question', methods=['POST'])
def get_question():
    data = request.get_json()
    asked_countries = data.get('asked', [])
    
    with engine.connect() as connection:
        if asked_countries:
            query = text("SELECT country FROM capitals WHERE country NOT IN :asked ORDER BY RANDOM() LIMIT 1")
            result = connection.execute(query, {'asked': tuple(asked_countries)}).fetchone()
        else:
            query = text("SELECT country FROM capitals ORDER BY RANDOM() LIMIT 1")
            result = connection.execute(query).fetchone()

        if result:
            return jsonify({"country": result[0]})
        else:
            return jsonify({"game_over": True, "message": "Congratulations! You've answered all the capitals of the world!"})

@app.route('/api/check_answer', methods=['POST'])
def check_answer():
    data = request.get_json()
    user_answer = data.get('answer', '').strip()
    country = data.get('country')

    with engine.connect() as connection:
        query = text("SELECT capital, lat, lon FROM capitals WHERE country = :country")
        question_info = connection.execute(query, {'country': country}).fetchone()

    if not question_info:
        return jsonify({"error": "Question not found"}), 404
    
    correct_capital, lat, lon = question_info
    is_correct = user_answer.lower() == correct_capital.lower()
    
    response = {
        'correct': is_correct,
        'message': f'Correct! The capital of {country} is {correct_capital}.' if is_correct else f'Sorry, the correct answer is {correct_capital}.',
        'location': { 'capital': correct_capital, 'lat': lat, 'lon': lon }
    }
    return jsonify(response)