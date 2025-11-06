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
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

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
    points = db.Column(db.Integer, default=0)
    is_admin = db.Column(db.Boolean, default=False)  # Admin flag
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    trips = db.relationship('Trip', backref='user', lazy=True, cascade="all, delete-orphan")
    user_achievements = db.relationship('UserAchievement', backref='user', lazy=True, cascade="all, delete-orphan")
    emergency_contacts = db.relationship('EmergencyContact', backref='user', lazy=True, cascade="all, delete-orphan")
    user_badges = db.relationship('UserBadge', backref='user', lazy=True, cascade="all, delete-orphan")
    user_challenges = db.relationship('UserChallenge', backref='user', lazy=True, cascade="all, delete-orphan")
    redemptions = db.relationship('Redemption', backref='user', lazy=True, cascade="all, delete-orphan")
    streak = db.relationship('UserStreak', backref='user', uselist=False, cascade="all, delete-orphan")

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start_location = db.Column(db.String(200), nullable=False)
    end_location = db.Column(db.String(200), nullable=False)
    duration_seconds = db.Column(db.Integer, nullable=False)
    yawn_count = db.Column(db.Integer, default=0)
    alert_count = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Achievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(200), nullable=False)
    icon = db.Column(db.String(50), nullable=False)  # Emoji or icon identifier
    criteria_type = db.Column(db.String(50), nullable=False)  # Type of achievement
    criteria_value = db.Column(db.Integer, nullable=False)  # Threshold value

class UserAchievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    achievement = db.relationship('Achievement', backref='user_achievements')

class EmergencyContact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    notification_type = db.Column(db.String(20), nullable=False, default='both')  # 'sms', 'email', 'both'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Badge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(200), nullable=False)
    icon = db.Column(db.String(50), nullable=False)  # Emoji or icon identifier
    criteria_type = db.Column(db.String(50), nullable=False)  # Type of badge criteria
    criteria_value = db.Column(db.Integer, nullable=False)  # Threshold value
    points_reward = db.Column(db.Integer, default=0)  # Bonus points for earning badge
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserBadge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    badge_id = db.Column(db.Integer, db.ForeignKey('badge.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    badge = db.relationship('Badge', backref='user_badges')

class Challenge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    challenge_type = db.Column(db.String(50), nullable=False)  # 'weekly', 'daily', 'monthly'
    criteria_type = db.Column(db.String(50), nullable=False)  # e.g., 'trips_with_zero_alerts'
    criteria_value = db.Column(db.Integer, nullable=False)
    points_reward = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserChallenge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    challenge_id = db.Column(db.Integer, db.ForeignKey('challenge.id'), nullable=False)
    progress = db.Column(db.Integer, default=0)
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    challenge = db.relationship('Challenge', backref='user_challenges')

class StoreItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    icon = db.Column(db.String(50), nullable=False)
    points_cost = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # 'discount', 'feature', 'cosmetic'
    stock = db.Column(db.Integer, default=-1)  # -1 = unlimited
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Redemption(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    store_item_id = db.Column(db.Integer, db.ForeignKey('store_item.id'), nullable=False)
    points_spent = db.Column(db.Integer, nullable=False)
    redeemed_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'completed', 'cancelled'
    store_item = db.relationship('StoreItem', backref='redemptions')

class UserStreak(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    current_streak = db.Column(db.Integer, default=0)
    longest_streak = db.Column(db.Integer, default=0)
    last_trip_date = db.Column(db.Date, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- Database Initialization Command ---
@app.cli.command("init-db")
def init_db_command():
    """Clear the existing data and create new tables."""
    db.create_all()
    
    # Initialize default achievements if they don't exist
    if Achievement.query.count() == 0:
        achievements = [
            Achievement(name="Road Warrior", description="Complete your first trip", icon="🛣️", criteria_type="first_trip", criteria_value=1),
            Achievement(name="Guardian Angel", description="Complete 5 trips with 0 alerts", icon="👼", criteria_type="zero_alerts", criteria_value=5),
            Achievement(name="Long Hauler", description="Drive for 2+ hours in one trip", icon="🚛", criteria_type="long_trip", criteria_value=7200),
            Achievement(name="Weekly Champion", description="Complete 7 trips in 7 days", icon="🏆", criteria_type="weekly_trips", criteria_value=7),
            Achievement(name="Centurion", description="Reach 100 total trips", icon="💯", criteria_type="total_trips", criteria_value=100),
            Achievement(name="Eagle Eye", description="Complete 10 consecutive trips with 0 alerts", icon="🦅", criteria_type="consecutive_zero_alerts", criteria_value=10),
            Achievement(name="Perfect Score", description="Achieve 100 safety score 5 times", icon="⭐", criteria_type="perfect_scores", criteria_value=5),
        ]
        for achievement in achievements:
            db.session.add(achievement)
        db.session.commit()
        click.echo("Default achievements created.")
    
    click.echo("Database initialized.")


# --- Helper Functions for Gamification ---
def calculate_trip_points(duration_seconds, alert_count, yawn_count):
    """Calculate points earned for a trip"""
    points = 10  # Base points for completing a trip
    
    # Bonus for zero alerts
    if alert_count == 0:
        points += 20
    
    # Bonus for zero yawns
    if yawn_count == 0:
        points += 10
    
    # Calculate safety score for this trip
    # Use a more balanced formula: deduct points per alert/yawn regardless of duration
    if duration_seconds > 0:
        # Deduct 3 points per alert, 1 point per yawn
        penalty_points = (alert_count * 3) + (yawn_count * 1)
        safety_score = max(0, min(100, round(100 - penalty_points)))
    else:
        safety_score = 100
    
    # Bonus for high safety score
    if safety_score > 90:
        points += 5
    
    return points, safety_score

def check_and_award_achievements(user_id):
    """Check if user has earned any new achievements"""
    user = User.query.get(user_id)
    trips = Trip.query.filter_by(user_id=user_id).order_by(Trip.timestamp.desc()).all()
    
    if not trips:
        return []
    
    newly_earned = []
    all_achievements = Achievement.query.all()
    earned_achievement_ids = [ua.achievement_id for ua in user.user_achievements]
    
    for achievement in all_achievements:
        # Skip if already earned
        if achievement.id in earned_achievement_ids:
            continue
        
        earned = False
        
        # Check criteria
        if achievement.criteria_type == "first_trip":
            if len(trips) >= 1:
                earned = True
        
        elif achievement.criteria_type == "zero_alerts":
            zero_alert_trips = [t for t in trips if t.alert_count == 0]
            if len(zero_alert_trips) >= achievement.criteria_value:
                earned = True
        
        elif achievement.criteria_type == "long_trip":
            if any(t.duration_seconds >= achievement.criteria_value for t in trips):
                earned = True
        
        elif achievement.criteria_type == "weekly_trips":
            # Check trips in last 7 days
            week_ago = datetime.utcnow() - timedelta(days=7)
            recent_trips = [t for t in trips if t.timestamp >= week_ago]
            if len(recent_trips) >= achievement.criteria_value:
                earned = True
        
        elif achievement.criteria_type == "total_trips":
            if len(trips) >= achievement.criteria_value:
                earned = True
        
        elif achievement.criteria_type == "consecutive_zero_alerts":
            # Check last N trips for zero alerts
            consecutive_count = 0
            for trip in trips:
                if trip.alert_count == 0:
                    consecutive_count += 1
                    if consecutive_count >= achievement.criteria_value:
                        earned = True
                        break
                else:
                    break
        
        elif achievement.criteria_type == "perfect_scores":
            # Count trips with perfect safety score
            perfect_count = 0
            for trip in trips:
                duration_hours = trip.duration_seconds / 3600
                if duration_hours > 0:
                    penalty = (trip.alert_count * 5 + trip.yawn_count * 2) / duration_hours
                    safety_score = max(0, round(100 - penalty))
                else:
                    safety_score = 100
                if safety_score == 100:
                    perfect_count += 1
            if perfect_count >= achievement.criteria_value:
                earned = True
        
        # Award achievement
        if earned:
            user_achievement = UserAchievement(user_id=user_id, achievement_id=achievement.id)
            db.session.add(user_achievement)
            newly_earned.append({
                'name': achievement.name,
                'description': achievement.description,
                'icon': achievement.icon
            })
    
    if newly_earned:
        db.session.commit()
    
    return newly_earned

def send_emergency_notification(user, alert_count, trip_start_location, trip_end_location=None):
    """Send emergency email notification to user's emergency contacts"""
    try:
        contacts = EmergencyContact.query.filter_by(user_id=user.id).all()
        if not contacts:
            return False
        
        sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
        sender_email = os.environ.get('SENDGRID_SENDER_EMAIL', 'noreply@driveguard.com')
        
        if not sendgrid_api_key:
            print("⚠️ SendGrid API key not configured")
            return False
        
        # Create email content
        user_name = user.email.split('@')[0]
        current_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
        app_link = os.environ.get('APP_URL', 'http://localhost:3000')
        
        subject = f"🚨 DriveGuard Alert: {user_name} needs attention"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #e74c3c; border-bottom: 3px solid #e74c3c; padding-bottom: 10px;">
                        🚨 Emergency Alert from DriveGuard
                    </h1>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        <strong>{user_name}</strong> is showing signs of severe drowsiness while driving.
                    </p>
                    
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #856404;">⚠️ Alert Details:</h3>
                        <ul style="color: #856404; font-size: 14px;">
                            <li><strong>Driver:</strong> {user_name}</li>
                            <li><strong>Alerts Detected:</strong> {alert_count} drowsiness alerts</li>
                            <li><strong>Time:</strong> {current_time}</li>
                            <li><strong>Start Location:</strong> {trip_start_location}</li>
                            {f'<li><strong>Current/End Location:</strong> {trip_end_location}</li>' if trip_end_location else ''}
                        </ul>
                    </div>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Please try to contact <strong>{user_name}</strong> immediately to ensure they are safe.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{app_link}" style="display: inline-block; padding: 15px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            View DriveGuard Dashboard
                        </a>
                    </div>
                    
                    <p style="font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 30px;">
                        This is an automated safety alert from DriveGuard. You are receiving this because you were listed as an emergency contact for {user_name}.
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Send to all contacts with email notification enabled
        sg = SendGridAPIClient(sendgrid_api_key)
        sent_count = 0
        
        for contact in contacts:
            if contact.notification_type in ['email', 'both'] and contact.email:
                try:
                    message = Mail(
                        from_email=sender_email,
                        to_emails=contact.email,
                        subject=subject,
                        html_content=html_content
                    )
                    response = sg.send(message)
                    if response.status_code in [200, 202]:
                        sent_count += 1
                        print(f"✅ Emergency email sent to {contact.name} ({contact.email})")
                except Exception as e:
                    print(f"❌ Failed to send email to {contact.email}: {e}")
        
        return sent_count > 0
    
    except Exception as e:
        print(f"❌ Error sending emergency notifications: {e}")
        return False


# --- Gamification Helper Functions ---
def update_user_streak(user_id, trip_date):
    """Update user's driving streak based on trip date"""
    from datetime import date, timedelta
    
    streak = UserStreak.query.filter_by(user_id=user_id).first()
    
    if not streak:
        # Create new streak record
        streak = UserStreak(user_id=user_id, current_streak=1, longest_streak=1, last_trip_date=trip_date)
        db.session.add(streak)
    else:
        last_date = streak.last_trip_date
        
        if last_date:
            days_diff = (trip_date - last_date).days
            
            if days_diff == 1:
                # Consecutive day - increment streak
                streak.current_streak += 1
                if streak.current_streak > streak.longest_streak:
                    streak.longest_streak = streak.current_streak
            elif days_diff == 0:
                # Same day - don't change streak
                pass
            else:
                # Streak broken - reset to 1
                streak.current_streak = 1
        else:
            streak.current_streak = 1
            streak.longest_streak = max(1, streak.longest_streak)
        
        streak.last_trip_date = trip_date
        streak.updated_at = datetime.utcnow()
    
    db.session.commit()
    return streak.current_streak

def check_and_award_badges(user_id, trip=None):
    """Check if user has earned any new badges"""
    from datetime import time as datetime_time
    
    user = User.query.get(user_id)
    trips = Trip.query.filter_by(user_id=user_id).order_by(Trip.timestamp.desc()).all()
    
    if not trips:
        return []
    
    newly_earned = []
    all_badges = Badge.query.filter_by(is_active=True).all()
    earned_badge_ids = [ub.badge_id for ub in user.user_badges]
    
    for badge in all_badges:
        # Skip if already earned
        if badge.id in earned_badge_ids:
            continue
        
        earned = False
        
        # Check badge criteria
        if badge.criteria_type == 'night_trips':
            # Count trips between 10 PM - 5 AM with zero alerts
            night_trips = [t for t in trips 
                          if (t.timestamp.hour >= 22 or t.timestamp.hour < 5) 
                          and t.alert_count == 0]
            if len(night_trips) >= badge.criteria_value:
                earned = True
        
        elif badge.criteria_type == 'long_safe_trip':
            # Trip longer than criteria_value seconds with safety score > 90
            for t in trips:
                if t.duration_seconds >= badge.criteria_value:
                    penalty = (t.alert_count * 3) + (t.yawn_count * 1)
                    safety_score = max(0, min(100, 100 - penalty))
                    if safety_score >= 90:
                        earned = True
                        break
        
        elif badge.criteria_type == 'zero_alert_trips':
            zero_alert_trips = [t for t in trips if t.alert_count == 0]
            if len(zero_alert_trips) >= badge.criteria_value:
                earned = True
        
        elif badge.criteria_type == 'morning_trips':
            # Count trips between 5 AM - 8 AM
            morning_trips = [t for t in trips 
                           if 5 <= t.timestamp.hour < 8]
            if len(morning_trips) >= badge.criteria_value:
                earned = True
        
        elif badge.criteria_type == 'streak_days':
            streak = UserStreak.query.filter_by(user_id=user_id).first()
            if streak and streak.longest_streak >= badge.criteria_value:
                earned = True
        
        elif badge.criteria_type == 'high_safety_trips':
            # Count trips with safety score >= 95
            high_safety_count = 0
            for t in trips:
                penalty = (t.alert_count * 3) + (t.yawn_count * 1)
                safety_score = max(0, min(100, 100 - penalty))
                if safety_score >= 95:
                    high_safety_count += 1
            
            if high_safety_count >= badge.criteria_value:
                earned = True
        
        # Award badge
        if earned:
            user_badge = UserBadge(user_id=user_id, badge_id=badge.id)
            db.session.add(user_badge)
            
            # Award bonus points
            if badge.points_reward > 0:
                user.points += badge.points_reward
            
            newly_earned.append({
                'name': badge.name,
                'description': badge.description,
                'icon': badge.icon,
                'points_reward': badge.points_reward
            })
    
    if newly_earned:
        db.session.commit()
    
    return newly_earned

def update_user_challenges(user_id, trip=None):
    """Update progress on active challenges"""
    from datetime import datetime
    
    # Get all active challenges
    now = datetime.utcnow()
    active_challenges = Challenge.query.filter(
        Challenge.is_active == True,
        Challenge.start_date <= now,
        Challenge.end_date >= now
    ).all()
    
    completed_challenges = []
    
    for challenge in active_challenges:
        # Get or create user challenge record
        user_challenge = UserChallenge.query.filter_by(
            user_id=user_id,
            challenge_id=challenge.id
        ).first()
        
        if not user_challenge:
            user_challenge = UserChallenge(user_id=user_id, challenge_id=challenge.id, progress=0)
            db.session.add(user_challenge)
        
        # Skip if already completed
        if user_challenge.completed:
            continue
        
        # Update progress based on challenge type
        if challenge.criteria_type == 'zero_alert_trips':
            # Count trips with zero alerts within challenge period
            trips = Trip.query.filter(
                Trip.user_id == user_id,
                Trip.alert_count == 0,
                Trip.timestamp >= challenge.start_date,
                Trip.timestamp <= challenge.end_date
            ).count()
            user_challenge.progress = trips
        
        elif challenge.criteria_type == 'daily_trip':
            # Check if user has a trip today
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_trips = Trip.query.filter(
                Trip.user_id == user_id,
                Trip.timestamp >= today_start
            ).count()
            user_challenge.progress = min(1, today_trips)
        
        elif challenge.criteria_type == 'high_safety_streak':
            # Check consecutive days with 90+ safety score
            # This is complex - for now just track days
            user_challenge.progress = user_challenge.progress  # Placeholder
        
        # Check if challenge is completed
        if user_challenge.progress >= challenge.criteria_value and not user_challenge.completed:
            user_challenge.completed = True
            user_challenge.completed_at = datetime.utcnow()
            
            # Award points
            user = User.query.get(user_id)
            user.points += challenge.points_reward
            
            completed_challenges.append({
                'name': challenge.name,
                'description': challenge.description,
                'points_reward': challenge.points_reward
            })
    
    if completed_challenges:
        db.session.commit()
    
    return completed_challenges


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

# --- Admin Authentication Decorator ---
def admin_required(f):
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
            if not current_user.is_admin:
                return jsonify({'message': 'Admin access required!'}), 403
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
    
    return jsonify({
        'token': token,
        'is_admin': user.is_admin,
        'email': user.email
    })

@app.route('/api/trips', methods=['POST'])
@token_required
def save_trip(current_user):
    from datetime import date
    
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
    
    # Calculate and award points
    points_earned, safety_score = calculate_trip_points(
        data['duration_seconds'],
        data['alert_count'],
        data['yawn_count']
    )
    current_user.points += points_earned
    db.session.commit()
    
    # Update streak
    trip_date = new_trip.timestamp.date()
    current_streak = update_user_streak(current_user.id, trip_date)
    
    # Check and award achievements
    newly_earned_achievements = check_and_award_achievements(current_user.id)
    
    # Check and award badges
    newly_earned_badges = check_and_award_badges(current_user.id, new_trip)
    
    # Update challenges
    completed_challenges = update_user_challenges(current_user.id, new_trip)
    
    return jsonify({
        'message': 'Trip saved successfully!',
        'trip_id': new_trip.id,  # Return trip_id for alert tracking
        'points_earned': points_earned,
        'total_points': current_user.points,
        'safety_score': safety_score,
        'current_streak': current_streak,
        'new_achievements': newly_earned_achievements,
        'new_badges': newly_earned_badges,
        'completed_challenges': completed_challenges
    })
    newly_earned_achievements = check_and_award_achievements(current_user.id)
    
    return jsonify({
        'message': 'Trip saved successfully!',
        'trip_id': new_trip.id,  # Return trip_id for alert tracking
        'points_earned': points_earned,
        'total_points': current_user.points,
        'safety_score': safety_score,
        'new_achievements': newly_earned_achievements
    })

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

@app.route('/api/trips/<int:trip_id>', methods=['PUT'])
@token_required
def update_trip(current_user, trip_id):
    """Update trip details (used to finalize trip data at trip end)"""
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first()
    if not trip:
        return jsonify({'message': 'Trip not found!'}), 404
    
    data = request.get_json()
    
    # Update fields if provided
    if 'duration_seconds' in data:
        trip.duration_seconds = data['duration_seconds']
    if 'yawn_count' in data:
        trip.yawn_count = data['yawn_count']
    if 'alert_count' in data:
        trip.alert_count = data['alert_count']
    
    db.session.commit()
    
    # Calculate and award points based on updated trip data
    points_earned, safety_score = calculate_trip_points(
        trip.duration_seconds,
        trip.alert_count,
        trip.yawn_count
    )
    current_user.points += points_earned
    db.session.commit()
    
    # Update streak
    trip_date = trip.timestamp.date()
    current_streak = update_user_streak(current_user.id, trip_date)
    
    # Check and award achievements
    newly_earned_achievements = check_and_award_achievements(current_user.id)
    
    # Check and award badges
    newly_earned_badges = check_and_award_badges(current_user.id, trip)
    
    # Update challenges
    completed_challenges = update_user_challenges(current_user.id, trip)
    
    return jsonify({
        'message': 'Trip updated successfully!',
        'trip_id': trip.id,
        'points_earned': points_earned,
        'total_points': current_user.points,
        'safety_score': safety_score,
        'current_streak': current_streak,
        'new_achievements': newly_earned_achievements,
        'new_badges': newly_earned_badges,
        'completed_challenges': completed_challenges
    })

@app.route('/api/analytics/summary', methods=['GET'])
@token_required
def get_analytics_summary(current_user):
    """Get summary statistics for the user's trips"""
    trips = Trip.query.filter_by(user_id=current_user.id).all()
    
    if not trips:
        return jsonify({
            'total_trips': 0,
            'total_duration': 0,
            'total_alerts': 0,
            'total_yawns': 0,
            'avg_alerts_per_trip': 0,
            'avg_yawns_per_trip': 0,
            'avg_duration_per_trip': 0,
            'overall_safety_score': 100  # Perfect score when no trips
        })
    
    total_duration = sum(trip.duration_seconds for trip in trips)
    total_alerts = sum(trip.alert_count for trip in trips)
    total_yawns = sum(trip.yawn_count for trip in trips)
    
    # Calculate overall safety score based on all trips
    # Use average of individual trip scores for fairer calculation
    if total_duration > 0:
        trip_scores = []
        for trip in trips:
            if trip.duration_seconds > 0:
                penalty = (trip.alert_count * 3) + (trip.yawn_count * 1)
                trip_score = max(0, min(100, round(100 - penalty)))
                trip_scores.append(trip_score)
        
        overall_safety_score = round(sum(trip_scores) / len(trip_scores)) if trip_scores else 100
    else:
        overall_safety_score = 100
    
    return jsonify({
        'total_trips': len(trips),
        'total_duration': total_duration,
        'total_alerts': total_alerts,
        'total_yawns': total_yawns,
        'avg_alerts_per_trip': round(total_alerts / len(trips), 2),
        'avg_yawns_per_trip': round(total_yawns / len(trips), 2),
        'avg_duration_per_trip': round(total_duration / len(trips), 2),
        'overall_safety_score': overall_safety_score
    })

@app.route('/api/analytics/trends', methods=['GET'])
@token_required
def get_analytics_trends(current_user):
    """Get trends data grouped by day, week, or month"""
    period = request.args.get('period', 'daily')  # daily, weekly, monthly
    
    trips = Trip.query.filter_by(user_id=current_user.id).order_by(Trip.timestamp).all()
    
    if not trips:
        return jsonify({'labels': [], 'alerts': [], 'yawns': [], 'trips': [], 'safety_scores': []})
    
    from collections import defaultdict
    grouped_data = defaultdict(lambda: {'alerts': 0, 'yawns': 0, 'trips': 0, 'duration': 0})
    
    for trip in trips:
        if period == 'daily':
            key = trip.timestamp.strftime('%Y-%m-%d')
        elif period == 'weekly':
            # Get ISO week number
            key = trip.timestamp.strftime('%Y-W%W')
        else:  # monthly
            key = trip.timestamp.strftime('%Y-%m')
        
        grouped_data[key]['alerts'] += trip.alert_count
        grouped_data[key]['yawns'] += trip.yawn_count
        grouped_data[key]['trips'] += 1
        grouped_data[key]['duration'] += trip.duration_seconds
    
    # Sort by date
    sorted_keys = sorted(grouped_data.keys())
    
    labels = []
    alerts = []
    yawns = []
    trip_counts = []
    safety_scores = []
    
    for key in sorted_keys:
        data = grouped_data[key]
        labels.append(key)
        alerts.append(data['alerts'])
        yawns.append(data['yawns'])
        trip_counts.append(data['trips'])
        
        # Calculate average safety score for the period
        if data['trips'] > 0:
            # Deduct 3 points per alert, 1 point per yawn (averaged per trip)
            avg_alerts = data['alerts'] / data['trips']
            avg_yawns = data['yawns'] / data['trips']
            penalty = (avg_alerts * 3) + (avg_yawns * 1)
            safety_score = max(0, min(100, round(100 - penalty)))
        else:
            safety_score = 100
        safety_scores.append(safety_score)
    
    return jsonify({
        'labels': labels,
        'alerts': alerts,
        'yawns': yawns,
        'trips': trip_counts,
        'safety_scores': safety_scores
    })

@app.route('/api/leaderboard', methods=['GET'])
@token_required
def get_leaderboard(current_user):
    """Get top 10 users by points and average safety score"""
    users = User.query.all()
    
    leaderboard_data = []
    for user in users:
        trips = Trip.query.filter_by(user_id=user.id).all()
        
        # Calculate average safety score
        if trips:
            total_safety_score = 0
            for trip in trips:
                duration_hours = trip.duration_seconds / 3600
                if duration_hours > 0:
                    penalty = (trip.alert_count * 5 + trip.yawn_count * 2) / duration_hours
                    safety_score = max(0, round(100 - penalty))
                else:
                    safety_score = 100
                total_safety_score += safety_score
            avg_safety_score = round(total_safety_score / len(trips), 1)
        else:
            avg_safety_score = 0
        
        # Generate display name from email
        display_name = user.email.split('@')[0]
        
        leaderboard_data.append({
            'user_id': user.id,
            'display_name': display_name,
            'points': user.points,
            'avg_safety_score': avg_safety_score,
            'total_trips': len(trips),
            'is_current_user': user.id == current_user.id
        })
    
    # Sort by points (descending) and get top 10
    leaderboard_by_points = sorted(leaderboard_data, key=lambda x: x['points'], reverse=True)[:10]
    
    # Sort by avg safety score (descending) and get top 10
    leaderboard_by_safety = sorted(leaderboard_data, key=lambda x: x['avg_safety_score'], reverse=True)[:10]
    
    return jsonify({
        'by_points': leaderboard_by_points,
        'by_safety_score': leaderboard_by_safety
    })

@app.route('/api/achievements', methods=['GET'])
@token_required
def get_user_achievements(current_user):
    """Get all achievements and user's earned achievements"""
    all_achievements = Achievement.query.all()
    user_achievements = UserAchievement.query.filter_by(user_id=current_user.id).all()
    
    earned_achievement_ids = {ua.achievement_id for ua in user_achievements}
    
    achievements_list = []
    for achievement in all_achievements:
        is_earned = achievement.id in earned_achievement_ids
        earned_date = None
        
        if is_earned:
            ua = next(ua for ua in user_achievements if ua.achievement_id == achievement.id)
            earned_date = ua.earned_at.isoformat()
        
        achievements_list.append({
            'id': achievement.id,
            'name': achievement.name,
            'description': achievement.description,
            'icon': achievement.icon,
            'is_earned': is_earned,
            'earned_at': earned_date
        })
    
    return jsonify({
        'achievements': achievements_list,
        'total_earned': len(earned_achievement_ids),
        'total_available': len(all_achievements)
    })

@app.route('/api/user/stats', methods=['GET'])
@token_required
def get_user_stats(current_user):
    """Get current user's points and basic stats"""
    trips = Trip.query.filter_by(user_id=current_user.id).all()
    user_achievements = UserAchievement.query.filter_by(user_id=current_user.id).count()
    
    # Calculate average safety score
    if trips:
        total_safety_score = 0
        for trip in trips:
            duration_hours = trip.duration_seconds / 3600
            if duration_hours > 0:
                penalty = (trip.alert_count * 5 + trip.yawn_count * 2) / duration_hours
                safety_score = max(0, round(100 - penalty))
            else:
                safety_score = 100
            total_safety_score += safety_score
        avg_safety_score = round(total_safety_score / len(trips), 1)
    else:
        avg_safety_score = 0
    
    return jsonify({
        'points': current_user.points,
        'total_trips': len(trips),
        'achievements_earned': user_achievements,
        'avg_safety_score': avg_safety_score,
        'display_name': current_user.email.split('@')[0]
    })

@app.route('/api/contacts', methods=['POST'])
@token_required
def add_emergency_contact(current_user):
    """Add a new emergency contact (max 3 per user)"""
    data = request.get_json()
    
    # Validate input
    if not data.get('name'):
        return jsonify({'message': 'Contact name is required'}), 400
    
    if not data.get('email') and not data.get('phone'):
        return jsonify({'message': 'At least one contact method (email or phone) is required'}), 400
    
    # Check max contacts limit
    existing_contacts = EmergencyContact.query.filter_by(user_id=current_user.id).count()
    if existing_contacts >= 3:
        return jsonify({'message': 'Maximum 3 emergency contacts allowed'}), 400
    
    # Create new contact
    new_contact = EmergencyContact(
        user_id=current_user.id,
        name=data['name'],
        phone=data.get('phone'),
        email=data.get('email'),
        notification_type=data.get('notification_type', 'both')
    )
    
    db.session.add(new_contact)
    db.session.commit()
    
    return jsonify({
        'message': 'Emergency contact added successfully',
        'contact': {
            'id': new_contact.id,
            'name': new_contact.name,
            'phone': new_contact.phone,
            'email': new_contact.email,
            'notification_type': new_contact.notification_type
        }
    }), 201

@app.route('/api/contacts', methods=['GET'])
@token_required
def get_emergency_contacts(current_user):
    """Get all emergency contacts for the current user"""
    contacts = EmergencyContact.query.filter_by(user_id=current_user.id).all()
    
    contacts_list = []
    for contact in contacts:
        contacts_list.append({
            'id': contact.id,
            'name': contact.name,
            'phone': contact.phone,
            'email': contact.email,
            'notification_type': contact.notification_type,
            'created_at': contact.created_at.isoformat()
        })
    
    return jsonify({
        'contacts': contacts_list,
        'count': len(contacts_list),
        'max_allowed': 3
    })

@app.route('/api/contacts/<int:contact_id>', methods=['DELETE'])
@token_required
def delete_emergency_contact(current_user, contact_id):
    """Delete an emergency contact"""
    contact = EmergencyContact.query.filter_by(id=contact_id, user_id=current_user.id).first()
    
    if not contact:
        return jsonify({'message': 'Contact not found'}), 404
    
    db.session.delete(contact)
    db.session.commit()
    
    return jsonify({'message': 'Emergency contact deleted successfully'})

@app.route('/api/alert', methods=['POST'])
@token_required
def log_alert(current_user):
    """Log real-time alert during trip and check if emergency notification should be sent"""
    data = request.get_json()
    
    trip_id = data.get('trip_id')
    alert_type = data.get('alert_type')  # 'yawn' or 'drowsy'
    timestamp_str = data.get('timestamp')
    
    print(f"🔔 Alert received: trip_id={trip_id}, alert_type={alert_type}")
    
    if not trip_id:
        return jsonify({'message': 'trip_id is required'}), 400
    
    # Get the trip
    trip = Trip.query.filter_by(id=trip_id, user_id=current_user.id).first()
    if not trip:
        print(f"❌ Trip not found: {trip_id}")
        return jsonify({'message': 'Trip not found'}), 404
    
    # Increment the trip's alert count in real-time
    trip.alert_count += 1
    db.session.commit()
    
    current_alert_count = trip.alert_count
    
    print(f"📊 Current alert count for trip {trip_id}: {current_alert_count}")
    
    # Threshold: Exactly 6 alerts triggers emergency notification (first time exceeding 5)
    # This ensures email is sent only ONCE when threshold is crossed
    emergency_notification_sent = False
    
    if current_alert_count == 6:  # Changed from > 5 to == 6
        print(f"⚠️ Alert threshold exceeded (6 alerts)! Sending emergency notification...")
        
        # Check if user has emergency contacts
        contacts = EmergencyContact.query.filter_by(user_id=current_user.id).all()
        print(f"👥 Found {len(contacts)} emergency contacts")
        
        if not contacts:
            print(f"❌ No emergency contacts found for user {current_user.email}")
            return jsonify({
                'message': 'Alert logged, but no emergency contacts configured',
                'emergency_notification_sent': False,
                'current_alert_count': current_alert_count
            })
        
        # Send emergency notification
        success = send_emergency_notification(
            user=current_user,
            alert_count=current_alert_count,
            trip_start_location=trip.start_location,
            trip_end_location=trip.end_location
        )
        emergency_notification_sent = success
        
        if success:
            print(f"✅ Emergency notification sent! Trip ID: {trip_id}, Alerts: {current_alert_count}")
        else:
            print(f"❌ Failed to send emergency notification")
    elif current_alert_count > 6:
        print(f"⏭️  Alert #{current_alert_count} - notification already sent at alert #6")
    
    return jsonify({
        'message': 'Alert logged',
        'emergency_notification_sent': emergency_notification_sent,
        'current_alert_count': current_alert_count
    })

# ==================== GAMIFICATION ENDPOINTS ====================

@app.route('/api/gamification/badges', methods=['GET'])
@token_required
def get_user_badges(current_user):
    """Get all badges and user's earned badges"""
    all_badges = Badge.query.filter_by(is_active=True).all()
    user_badges = UserBadge.query.filter_by(user_id=current_user.id).all()
    
    earned_badge_ids = {ub.badge_id for ub in user_badges}
    
    badges_list = []
    for badge in all_badges:
        is_earned = badge.id in earned_badge_ids
        earned_date = None
        
        if is_earned:
            ub = next(ub for ub in user_badges if ub.badge_id == badge.id)
            earned_date = ub.earned_at.isoformat()
        
        badges_list.append({
            'id': badge.id,
            'name': badge.name,
            'description': badge.description,
            'icon': badge.icon,
            'points_reward': badge.points_reward,
            'is_earned': is_earned,
            'earned_at': earned_date
        })
    
    return jsonify({
        'badges': badges_list,
        'total_earned': len(earned_badge_ids),
        'total_available': len(all_badges)
    })

@app.route('/api/gamification/challenges', methods=['GET'])
@token_required
def get_user_challenges(current_user):
    """Get all active challenges and user's progress"""
    from datetime import datetime
    
    now = datetime.utcnow()
    active_challenges = Challenge.query.filter(
        Challenge.is_active == True,
        Challenge.start_date <= now,
        Challenge.end_date >= now
    ).all()
    
    challenges_list = []
    for challenge in active_challenges:
        user_challenge = UserChallenge.query.filter_by(
            user_id=current_user.id,
            challenge_id=challenge.id
        ).first()
        
        progress = user_challenge.progress if user_challenge else 0
        completed = user_challenge.completed if user_challenge else False
        completed_at = user_challenge.completed_at.isoformat() if user_challenge and user_challenge.completed_at else None
        
        challenges_list.append({
            'id': challenge.id,
            'name': challenge.name,
            'description': challenge.description,
            'challenge_type': challenge.challenge_type,
            'criteria_value': challenge.criteria_value,
            'points_reward': challenge.points_reward,
            'start_date': challenge.start_date.isoformat(),
            'end_date': challenge.end_date.isoformat(),
            'progress': progress,
            'completed': completed,
            'completed_at': completed_at
        })
    
    return jsonify({'challenges': challenges_list})

@app.route('/api/gamification/store', methods=['GET'])
@token_required
def get_store_items(current_user):
    """Get all available store items"""
    items = StoreItem.query.filter_by(is_active=True).all()
    
    items_list = []
    for item in items:
        # Check if user has enough points
        can_afford = current_user.points >= item.points_cost
        
        # Check if item is in stock
        in_stock = item.stock != 0  # -1 = unlimited, 0 = out of stock
        
        items_list.append({
            'id': item.id,
            'name': item.name,
            'description': item.description,
            'icon': item.icon,
            'points_cost': item.points_cost,
            'category': item.category,
            'stock': item.stock,
            'can_afford': can_afford,
            'in_stock': in_stock
        })
    
    return jsonify({
        'items': items_list,
        'user_points': current_user.points
    })

@app.route('/api/gamification/redeem', methods=['POST'])
@token_required
def redeem_store_item(current_user):
    """Redeem a store item with points"""
    data = request.get_json()
    item_id = data.get('item_id')
    
    if not item_id:
        return jsonify({'message': 'Item ID is required'}), 400
    
    item = StoreItem.query.get(item_id)
    if not item or not item.is_active:
        return jsonify({'message': 'Item not found or unavailable'}), 404
    
    # Check if user has enough points
    if current_user.points < item.points_cost:
        return jsonify({'message': 'Insufficient points'}), 400
    
    # Check stock
    if item.stock == 0:
        return jsonify({'message': 'Item out of stock'}), 400
    
    # Deduct points
    current_user.points -= item.points_cost
    
    # Update stock (if limited)
    if item.stock > 0:
        item.stock -= 1
    
    # Create redemption record
    redemption = Redemption(
        user_id=current_user.id,
        store_item_id=item.id,
        points_spent=item.points_cost,
        status='completed'
    )
    db.session.add(redemption)
    db.session.commit()
    
    return jsonify({
        'message': 'Item redeemed successfully!',
        'item_name': item.name,
        'points_spent': item.points_cost,
        'remaining_points': current_user.points,
        'redemption_id': redemption.id
    })

@app.route('/api/gamification/streak', methods=['GET'])
@token_required
def get_user_streak(current_user):
    """Get user's current streak information"""
    streak = UserStreak.query.filter_by(user_id=current_user.id).first()
    
    if not streak:
        return jsonify({
            'current_streak': 0,
            'longest_streak': 0,
            'last_trip_date': None
        })
    
    return jsonify({
        'current_streak': streak.current_streak,
        'longest_streak': streak.longest_streak,
        'last_trip_date': streak.last_trip_date.isoformat() if streak.last_trip_date else None,
        'updated_at': streak.updated_at.isoformat()
    })

@app.route('/api/gamification/redemptions', methods=['GET'])
@token_required
def get_user_redemptions(current_user):
    """Get user's redemption history"""
    redemptions = Redemption.query.filter_by(user_id=current_user.id).order_by(Redemption.redeemed_at.desc()).all()
    
    redemptions_list = []
    for redemption in redemptions:
        redemptions_list.append({
            'id': redemption.id,
            'item_name': redemption.store_item.name,
            'item_icon': redemption.store_item.icon,
            'points_spent': redemption.points_spent,
            'status': redemption.status,
            'redeemed_at': redemption.redeemed_at.isoformat()
        })
    
    return jsonify({'redemptions': redemptions_list})

# ==================== ADMIN ENDPOINTS ====================

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def get_admin_stats(current_user):
    """Get system-wide statistics for admin dashboard"""
    total_users = User.query.count()
    total_trips = Trip.query.count()
    total_alerts = db.session.query(db.func.sum(Trip.alert_count)).scalar() or 0
    total_yawns = db.session.query(db.func.sum(Trip.yawn_count)).scalar() or 0
    total_duration = db.session.query(db.func.sum(Trip.duration_seconds)).scalar() or 0
    
    # Recent activity - since Trip doesn't have created_at, we'll show 0
    # You can add created_at column to Trip later if needed
    recent_trips = 0
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    try:
        recent_users = User.query.filter(User.created_at >= one_day_ago).count()
    except:
        recent_users = 0  # If created_at doesn't exist on User
    
    return jsonify({
        'total_users': total_users,
        'total_trips': total_trips,
        'total_alerts': total_alerts,
        'total_yawns': total_yawns,
        'total_duration': total_duration,
        'recent_trips_24h': recent_trips,
        'recent_users_24h': recent_users
    })

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_all_users(current_user):
    """Get all users with their statistics"""
    users = User.query.all()
    
    users_data = []
    for user in users:
        trips = Trip.query.filter_by(user_id=user.id).all()
        
        # Calculate user stats
        total_trips = len(trips)
        total_alerts = sum(trip.alert_count for trip in trips)
        total_yawns = sum(trip.yawn_count for trip in trips)
        total_duration = sum(trip.duration_seconds for trip in trips)
        
        # Calculate safety score
        if total_trips > 0:
            trip_scores = []
            for trip in trips:
                if trip.duration_seconds > 0:
                    penalty = (trip.alert_count * 3) + (trip.yawn_count * 1)
                    trip_score = max(0, min(100, round(100 - penalty)))
                    trip_scores.append(trip_score)
            safety_score = round(sum(trip_scores) / len(trip_scores)) if trip_scores else 100
        else:
            safety_score = 100
        
        # Get emergency contacts count
        emergency_contacts_count = EmergencyContact.query.filter_by(user_id=user.id).count()
        
        users_data.append({
            'id': user.id,
            'email': user.email,
            'is_admin': user.is_admin,
            'points': user.points,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'total_trips': total_trips,
            'total_alerts': total_alerts,
            'total_yawns': total_yawns,
            'total_duration': total_duration,
            'safety_score': safety_score,
            'emergency_contacts': emergency_contacts_count
        })
    
    return jsonify({'users': users_data})

@app.route('/api/admin/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user_details(current_user, user_id):
    """Get detailed information about a specific user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Order by id instead of created_at (which doesn't exist on Trip)
    trips = Trip.query.filter_by(user_id=user_id).order_by(Trip.id.desc()).all()
    emergency_contacts = EmergencyContact.query.filter_by(user_id=user_id).all()
    
    trips_data = []
    for trip in trips:
        penalty = (trip.alert_count * 3) + (trip.yawn_count * 1)
        trip_safety_score = max(0, min(100, round(100 - penalty))) if trip.duration_seconds > 0 else 100
        
        trips_data.append({
            'id': trip.id,
            'start_location': trip.start_location,
            'end_location': trip.end_location,
            'duration_seconds': trip.duration_seconds,
            'alert_count': trip.alert_count,
            'yawn_count': trip.yawn_count,
            'safety_score': trip_safety_score,
            'created_at': None  # Trip doesn't have created_at column
        })
    
    contacts_data = [{
        'id': contact.id,
        'name': contact.name,
        'phone': contact.phone,
        'email': contact.email,
        'notification_type': contact.notification_type
    } for contact in emergency_contacts]
    
    return jsonify({
        'user': {
            'id': user.id,
            'email': user.email,
            'is_admin': user.is_admin,
            'points': user.points,
            'created_at': user.created_at.isoformat() if user.created_at else None
        },
        'trips': trips_data,
        'emergency_contacts': contacts_data
    })

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(current_user, user_id):
    """Delete a user and all their data"""
    if user_id == current_user.id:
        return jsonify({'message': 'Cannot delete your own admin account'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'User deleted successfully'})

@app.route('/api/admin/users/<int:user_id>/toggle-admin', methods=['PUT'])
@admin_required
def toggle_admin(current_user, user_id):
    """Toggle admin status for a user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    user.is_admin = not user.is_admin
    db.session.commit()
    
    return jsonify({
        'message': f'User admin status updated to {user.is_admin}',
        'is_admin': user.is_admin
    })

# --- Main Entry Point ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)




