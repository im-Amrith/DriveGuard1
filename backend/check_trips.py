from app import app, db, Trip, User

with app.app_context():
    print("=== Database Check ===")
    print(f"Total users: {User.query.count()}")
    print(f"Total trips: {Trip.query.count()}")
    
    if Trip.query.count() > 0:
        trips = Trip.query.all()
        print("\nTrip details:")
        for trip in trips:
            print(f"  Trip ID: {trip.id}, Alerts: {trip.alert_count}, Yawns: {trip.yawn_count}, Duration: {trip.duration_seconds}s")
    else:
        print("\nNo trips found. The safety score will show 100 (perfect score) by default.")
