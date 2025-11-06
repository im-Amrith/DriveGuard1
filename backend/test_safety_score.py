from app import app, db, Trip

with app.app_context():
    trips = Trip.query.all()
    
    print("=== New Safety Score Calculation ===\n")
    
    trip_scores = []
    for trip in trips:
        if trip.duration_seconds > 0:
            penalty = (trip.alert_count * 3) + (trip.yawn_count * 1)
            score = max(0, min(100, round(100 - penalty)))
            trip_scores.append(score)
            print(f"Trip {trip.id}: {trip.alert_count} alerts, {trip.yawn_count} yawns → Penalty: {penalty} → Score: {score}")
    
    overall_score = round(sum(trip_scores) / len(trip_scores)) if trip_scores else 100
    
    print(f"\n{'='*50}")
    print(f"Overall Safety Score: {overall_score}")
    print(f"{'='*50}")
    
    # Show breakdown
    print(f"\nTotal Trips: {len(trips)}")
    print(f"Total Alerts: {sum(t.alert_count for t in trips)}")
    print(f"Total Yawns: {sum(t.yawn_count for t in trips)}")
    print(f"Average Score: {overall_score}")
