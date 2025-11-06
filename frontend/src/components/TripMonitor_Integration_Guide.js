// TripMonitor Integration Guide for Emergency Contact Alerts
// Add this code to your existing TripMonitor.js component

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const TripMonitor = ({ onTripEnd }) => {
    // ... your existing state variables ...
    
    // NEW: Add these state variables for alert tracking
    const [currentTripId, setCurrentTripId] = useState(null);
    const [alertTimestamps, setAlertTimestamps] = useState([]);
    const [notificationSent, setNotificationSent] = useState(false);
    
    // NEW: Function to send alert to backend
    const sendAlertToBackend = async (alertType) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_BASE_URL}/api/alert`,
                {
                    trip_id: currentTripId,
                    alert_type: alertType, // 'yawn' or 'drowsy'
                    timestamp: new Date().toISOString()
                },
                { headers: { 'x-access-token': token } }
            );
            
            // Check if emergency notification was sent
            if (response.data.emergency_notification_sent && !notificationSent) {
                setNotificationSent(true);
                
                // Show prominent alert to user
                alert('⚠️ EMERGENCY CONTACTS NOTIFIED!\n\nDue to excessive drowsiness alerts, your emergency contacts have been notified. Please pull over to a safe location and take a break.');
                
                // Optional: Play warning sound
                playWarningSound();
            }
        } catch (error) {
            console.error('Error sending alert to backend:', error);
        }
    };
    
    // NEW: Function to play warning sound
    const playWarningSound = () => {
        // You can add an audio file or use Web Audio API
        const audio = new Audio('/warning.mp3'); // Add warning.mp3 to public folder
        audio.play().catch(e => console.log('Could not play warning sound', e));
    };
    
    // NEW: Function to track local alerts (for UI feedback)
    const trackLocalAlert = (alertType) => {
        const now = Date.now();
        setAlertTimestamps(prev => {
            // Keep only alerts from last 2 minutes
            const twoMinutesAgo = now - (2 * 60 * 1000);
            const recentAlerts = prev.filter(timestamp => timestamp > twoMinutesAgo);
            return [...recentAlerts, now];
        });
    };
    
    // MODIFY YOUR EXISTING ALERT DETECTION CODE
    // Example: Where you currently detect yawns or drowsiness
    
    // OLD CODE (example):
    // if (yawnDetected) {
    //     setAlertCount(prev => prev + 1);
    //     playAlert();
    // }
    
    // NEW CODE (example):
    const handleYawnDetection = () => {
        // Your existing yawn handling
        setAlertCount(prev => prev + 1);
        playAlert();
        
        // NEW: Send to backend and track locally
        trackLocalAlert('yawn');
        sendAlertToBackend('yawn');
    };
    
    const handleDrowsinessDetection = () => {
        // Your existing drowsiness handling
        setAlertCount(prev => prev + 1);
        playAlert();
        
        // NEW: Send to backend and track locally
        trackLocalAlert('drowsy');
        sendAlertToBackend('drowsy');
    };
    
    // NEW: Start trip handler - get trip ID
    const handleStartTrip = async (startLocation, endLocation) => {
        try {
            const token = localStorage.getItem('token');
            
            // Create trip record
            const response = await axios.post(
                `${API_BASE_URL}/api/trips`,
                {
                    start_location: startLocation,
                    end_location: endLocation,
                    // ... other trip data
                },
                { headers: { 'x-access-token': token } }
            );
            
            // Store trip ID for alert logging
            setCurrentTripId(response.data.trip_id);
            
            // Reset alert tracking
            setAlertTimestamps([]);
            setNotificationSent(false);
            
        } catch (error) {
            console.error('Error starting trip:', error);
        }
    };
    
    // NEW: Display alert counter in UI
    const renderAlertCounter = () => {
        const now = Date.now();
        const twoMinutesAgo = now - (2 * 60 * 1000);
        const recentAlertCount = alertTimestamps.filter(t => t > twoMinutesAgo).length;
        
        return (
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: recentAlertCount >= 5 ? 'rgba(231, 76, 60, 0.9)' : 'rgba(52, 73, 94, 0.9)',
                padding: '15px 25px',
                borderRadius: '30px',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                animation: recentAlertCount >= 5 ? 'pulse 1s infinite' : 'none'
            }}>
                {recentAlertCount >= 5 && '⚠️ '} 
                Alerts (2 min): {recentAlertCount}/5
            </div>
        );
    };
    
    return (
        <div style={{ position: 'relative' }}>
            {/* Your existing TripMonitor UI */}
            
            {/* NEW: Alert counter overlay */}
            {renderAlertCounter()}
            
            {/* NEW: Emergency notification banner */}
            {notificationSent && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(231, 76, 60, 0.95)',
                    padding: '40px',
                    borderRadius: '20px',
                    color: 'white',
                    textAlign: 'center',
                    zIndex: 9999,
                    maxWidth: '500px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}>
                    <h2 style={{ margin: '0 0 20px 0', fontSize: '28px' }}>🚨 EMERGENCY ALERT</h2>
                    <p style={{ fontSize: '18px', lineHeight: '1.5' }}>
                        Your emergency contacts have been notified due to excessive drowsiness detection.
                        <br /><br />
                        <strong>Please pull over to a safe location immediately.</strong>
                    </p>
                    <button 
                        onClick={() => setNotificationSent(false)}
                        style={{
                            marginTop: '20px',
                            padding: '12px 30px',
                            background: 'white',
                            color: '#e74c3c',
                            border: 'none',
                            borderRadius: '30px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        I Understand
                    </button>
                </div>
            )}
            
            {/* Rest of your TripMonitor component */}
        </div>
    );
};

// Add CSS animation for pulse effect
const styles = `
@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.05);
        opacity: 0.9;
    }
}
`;

export default TripMonitor;


// ============================================
// INTEGRATION CHECKLIST
// ============================================

/*
✅ Step 1: Import axios at the top of TripMonitor.js
✅ Step 2: Add new state variables (currentTripId, alertTimestamps, notificationSent)
✅ Step 3: Add sendAlertToBackend() function
✅ Step 4: Add trackLocalAlert() function
✅ Step 5: Modify your existing alert detection code to call these functions
✅ Step 6: Update trip start handler to get and store trip_id
✅ Step 7: Add renderAlertCounter() UI element
✅ Step 8: Add emergency notification banner UI
✅ Step 9: Test with rapid alerts to trigger notification

IMPORTANT: Make sure to:
- Save trip_id when trip starts (you might already be doing this)
- Call sendAlertToBackend() every time an alert is triggered
- Handle the case where backend is unavailable (try-catch)
- Show clear visual feedback to the user when threshold is reached
*/
