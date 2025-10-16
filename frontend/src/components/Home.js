import React, { useState, useMemo } from 'react';
import TripMonitor from './TripMonitor';
import axios from 'axios'; // Import axios

// --- SVG Icons ---
const RoadIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13.5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4.5"/><path d="M12 10h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4.5"/><path d="M8 8v2a2 2 0 0 0 2 2h2"/><line x1="12" y1="22" x2="12" y2="10"/></svg>;
const ClockIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const AlertTriangleIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const MoonIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const LogoutIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const TrashIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;


// Home now receives isLoadingTrips prop
const Home = ({ trips, isLoadingTrips, onLogout, refreshTrips }) => {
    const [view, setView] = useState('dashboard');
    const [userLocation, setUserLocation] = useState('your location');

    useState(() => {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                setUserLocation(data.address.city || data.address.town || 'your location');
            } catch (e) { console.error("Error fetching location name", e); }
        });
    }, []);

    const lifetimeStats = useMemo(() => {
        const totalDuration = trips.reduce((acc, trip) => acc + trip.duration_seconds, 0);
        const totalAlerts = trips.reduce((acc, trip) => acc + trip.alert_count, 0);
        const totalYawns = trips.reduce((acc, trip) => acc + trip.yawn_count, 0);
        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        return { totalTrips: trips.length, totalHours: hours, totalMinutes: minutes, totalAlerts, totalYawns };
    }, [trips]);

    const safetyScore = useMemo(() => {
        if (lifetimeStats.totalHours === 0 && lifetimeStats.totalMinutes < 10) return 100;
        const totalDurationInHours = lifetimeStats.totalHours + lifetimeStats.totalMinutes / 60;
        const penaltyPoints = (lifetimeStats.totalAlerts * 5 + lifetimeStats.totalYawns * 2) / (totalDurationInHours || 1);
        return Math.max(0, Math.round(100 - penaltyPoints));
    }, [lifetimeStats]);

    const handleTripEnd = () => {
        setView('dashboard');
        refreshTrips();
    };

    const handleDeleteTrip = async (tripId) => {
        // A simple confirmation dialog
        if (window.confirm('Are you sure you want to delete this trip history?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://127.0.0.1:5000/api/trips/${tripId}`, {
                    headers: { 'x-access-token': token }
                });
                refreshTrips(); // Refresh the list after successful deletion
            } catch (error) {
                console.error("Could not delete trip", error);
                alert("Failed to delete trip.");
            }
        }
    };

    if (view === 'trip') {
        return <TripMonitor onTripEnd={handleTripEnd} />;
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.leftColumn}>
                    <div style={styles.header}>
                        <div>
                            <h1 style={styles.title}>DriveGuard Dashboard</h1>
                            <p style={styles.subtitle}>Welcome back, stay safe on the roads of {userLocation}.</p>
                        </div>
                        <button onClick={onLogout} style={styles.logoutButton} title="Logout"><LogoutIcon /></button>
                    </div>
                    
                    <div style={styles.ctaCard}>
                        <h2>Ready for the road?</h2>
                        <p>Start a new trip to begin monitoring your alertness in real-time.</p>
                        <button onClick={() => setView('trip')} style={styles.startButton}>Start New Trip</button>
                    </div>

                    <div style={styles.tripsSection}>
                        <h2>Previous Trips</h2>
                        <div style={styles.tripList}>
                            {isLoadingTrips ? (
                                <p>Loading trip history...</p>
                            ) : trips.length > 0 ? (
                                trips.map(trip => (
                                    <div key={trip.id} style={styles.tripCard}>
                                        <div style={styles.tripCardHeader}>
                                            <div style={{ flex: 1 }}>
                                                <p><strong>From:</strong> {trip.start_location}</p>
                                                <p><strong>To:</strong> {trip.end_location}</p>
                                            </div>
                                            <button onClick={() => handleDeleteTrip(trip.id)} style={styles.deleteButton} title="Delete Trip">
                                                <TrashIcon />
                                            </button>
                                        </div>
                                        <div style={styles.tripCardBody}>
                                            <span>{new Date(trip.timestamp).toLocaleDateString()}</span>
                                            <span>Duration: {new Date(trip.duration_seconds * 1000).toISOString().substr(11, 8)}</span>
                                            <span>Alerts: {trip.alert_count}</span>
                                            <span>Yawns: {trip.yawn_count}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>Your trip history will appear here.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div style={styles.rightColumn}>
                    <div style={styles.safetyScoreCard}>
                        <h3>Driver Safety Score</h3>
                        <div style={styles.scoreCircle}>
                            <span style={styles.scoreText}>{safetyScore}</span>
                        </div>
                        <p style={styles.scoreSubtext}>Based on your overall driving performance.</p>
                    </div>

                    <h3 style={styles.statsTitle}>Lifetime Statistics</h3>
                    <div style={styles.statsGrid}>
                        <div style={styles.statCard}>
                            <RoadIcon />
                            <h4>Total Trips</h4>
                            <span>{lifetimeStats.totalTrips}</span>
                        </div>
                        <div style={styles.statCard}>
                            <ClockIcon />
                            <h4>Time Driven</h4>
                            <span>{lifetimeStats.totalHours}h {lifetimeStats.totalMinutes}m</span>
                        </div>
                        <div style={styles.statCard}>
                            <AlertTriangleIcon />
                            <h4>Drowsy Alerts</h4>
                            <span>{lifetimeStats.totalAlerts}</span>
                        </div>
                        <div style={styles.statCard}>
                            <MoonIcon />
                            <h4>Yawns Detected</h4>
                            <span>{lifetimeStats.totalYawns}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(to right, #0f2027, #203a43, #2c5364)',
        color: '#f0f2f5',
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
    },
    container: {
        display: 'flex',
        padding: '40px',
        gap: '40px',
        animation: 'fadeIn 1s ease-in-out',
    },
    leftColumn: {
        flex: '2 1 65%',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
    },
    rightColumn: {
        flex: '1 1 35%',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        margin: 0,
        fontSize: '2.5rem',
        fontWeight: '600',
    },
    subtitle: {
        margin: '5px 0 0 0',
        color: '#bdc3c7',
    },
    logoutButton: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#fff',
        padding: '12px',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.3s',
    },
    ctaCard: {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '30px',
        borderRadius: '15px',
        textAlign: 'center',
    },
    startButton: {
        background: '#4CAF50',
        color: 'white',
        border: 'none',
        padding: '15px 40px',
        borderRadius: '30px',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    tripsSection: {
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '30px',
        borderRadius: '15px',
    },
    tripList: {
        maxHeight: '400px',
        overflowY: 'auto',
        paddingRight: '10px'
    },
    tripCard: {
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '15px',
    },
    tripCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: '10px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    },
    tripCardBody: {
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: '10px',
        color: '#bdc3c7',
        fontSize: '0.9rem',
    },
    deleteButton: {
        background: 'rgba(255, 82, 82, 0.1)',
        border: '1px solid rgba(255, 82, 82, 0.2)',
        color: '#ff5252',
        padding: '8px',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.3s',
    },
    safetyScoreCard: {
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '30px',
        borderRadius: '15px',
        textAlign: 'center',
    },
    scoreCircle: {
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        margin: '20px auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle, rgba(76,175,80,0.8) 0%, rgba(76,175,80,0.2) 70%)',
    },
    scoreText: {
        fontSize: '3.5rem',
        fontWeight: 'bold',
    },
    scoreSubtext: {
        color: '#bdc3c7',
    },
    statsTitle: {
        marginTop: '20px',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
    },
    statCard: {
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '20px',
        borderRadius: '15px',
        textAlign: 'center',
    },
};

export default Home;

