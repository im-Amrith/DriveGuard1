import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from functools import wraps
import click 
from dotenv import load_dotenv # Import the dotenv package

load_dotenv() # Load environment variables from .env file

# --- App Initialization ---
app = Flask(__name__)
CORS(app)

# --- Configuration ---
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_default_secret_key_here')
basedir = os.path.abspath(os.path.dirname(__file__))

# --- Dynamic Database Configuration ---
# This will now automatically read from your .env file
database_url = os.environ.get('DATABASE_URL')
if database_url:
    database_url = database_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///' + os.path.join(basedir, 'instance', 'driveguard.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_pre_ping": True,
    "pool_recycle": 300
}
# --- Database Setup ---
db = SQLAlchemy(app)

if not os.path.exists(os.path.join(basedir, 'instance')):
    os.makedirs(os.path.join(basedir, 'instance'))

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    trips = db.relationship('Trip', backref='user', lazy=True, cascade="all, delete-orphan")

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start_location = db.Column(db.String(200), nullable=False)
    end_location = db.Column(db.String(200), nullable=False)
    duration_seconds = db.Column(db.Integer, nullable=False)
    yawn_count = db.Column(db.Integer, default=0)
    alert_count = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# --- Database Initialization Command ---
@app.cli.command("init-db")
def init_db_command():
    """Clear the existing data and create new tables."""
    db.create_all()
    click.echo("Database initialized.")


# --- Authentication Decorator ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['id']).first()
            if current_user is None:
                return jsonify({'message': 'Token is invalid, user not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        except Exception:
            return jsonify({'message': 'An error occurred while processing the token.'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

# --- API Routes ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password!'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'User with this email already exists!'}), 409

    hashed_password = generate_password_hash(data['password'])
    new_user = User(email=data['email'], password=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'New user created!'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password!'}), 400

    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'message': 'Login failed! Invalid credentials.'}), 401
    
    token = jwt.encode({
        'id': user.id,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({'token': token})

@app.route('/api/trips', methods=['POST'])
@token_required
def save_trip(current_user):
    data = request.get_json()
    new_trip = Trip(
        user_id=current_user.id,
        start_location=data['start_location'],
        end_location=data['end_location'],
        duration_seconds=data['duration_seconds'],
        yawn_count=data['yawn_count'],
        alert_count=data['alert_count']
    )
    db.session.add(new_trip)
    db.session.commit()
    return jsonify({'message': 'Trip saved successfully!'})

@app.route('/api/trips', methods=['GET'])
@token_required
def get_trips(current_user):
    trips = Trip.query.filter_by(user_id=current_user.id).all()
    output = []
    for trip in trips:
        trip_data = {
            'id': trip.id,
            'start_location': trip.start_location,
            'end_location': trip.end_location,
            'duration_seconds': trip.duration_seconds,
            'yawn_count': trip.yawn_count,
            'alert_count': trip.alert_count,
            'timestamp': trip.timestamp.isoformat()
        }
        output.append(trip_data)
    
    return jsonify({'trips': output})

@app.route('/api/trips/<int:trip_id>', methods=['DELETE'])
@token_required
def delete_trip(current_user, trip_id):
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first()
    if not trip:
        return jsonify({'message': 'Trip not found!'}), 404

    db.session.delete(trip)
    db.session.commit()
    return jsonify({'message': 'Trip deleted successfully!'})

# --- Main Entry Point ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)


