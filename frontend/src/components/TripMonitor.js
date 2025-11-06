import React, { useRef, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FaceMesh } from '@mediapipe/face_mesh';
import { GoogleMap, useJsApiLoader, Autocomplete, DirectionsRenderer, Marker } from '@react-google-maps/api';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
// --- Configuration ---
const EAR_THRESHOLD = 0.2;
const EAR_CONSEC_FRAMES = 15;
const MAR_THRESHOLD = 0.75;
const YAWN_CONSEC_FRAMES = 10;
const DEFAULT_MAP_CENTER = { lat: 13.0827, lng: 80.2707 }; // Default to Chennai

const TripMonitor = ({ onTripEnd }) => {
    const videoRef = useRef(null);
    const alarmAudioRef = useRef(null);
    const faceMeshRef = useRef(null);
    const animationFrameId = useRef(null);
    
    // Google Maps specific refs
    const startLocationRef = useRef(null);
    const endLocationRef = useRef(null);
    const mapRef = useRef(null);
    const watchIdRef = useRef(null);

    const [isTripStarted, setIsTripStarted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [statusText, setStatusText] = useState("Initializing...");
    
    const [startTime, setStartTime] = useState(null);
    const [alertCount, setAlertCount] = useState(0);
    const [yawnCount, setYawnCount] = useState(0);
    const [isRouteVisible, setIsRouteVisible] = useState(false);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [currentHeading, setCurrentHeading] = useState(0);
    
    // Emergency Contact Alert System - using ref for immediate access
    const currentTripIdRef = useRef(null);
    const [alertTimestamps, setAlertTimestamps] = useState([]);
    const [notificationSent, setNotificationSent] = useState(false);

    const earCounter = useRef(0);
    const yawnCounter = useRef(0);
    const isAlarming = useRef(false);
    const isYawning = useRef(false);

    // --- Google Maps API Loader ---
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        libraries: ['places'],
        mapIds: process.env.REACT_APP_GOOGLE_MAPS_MAP_ID
        ? [process.env.REACT_APP_GOOGLE_MAPS_MAP_ID]
        : [],
 // Required for Vector Maps
    });

    // --- AI & Camera Logic (Unchanged) ---
    const calculateDistance = (p1, p2) => {
        if (!p1 || !p2) return 0;
        const video = videoRef.current;
        if (!video || !video.videoWidth) return 0;
        const x1 = p1.x * video.videoWidth;
        const y1 = p1.y * video.videoHeight;
        const x2 = p2.x * video.videoWidth;
        const y2 = p2.y * video.videoHeight;
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    };
    const calculateEAR = (eye) => {
        const a = calculateDistance(eye[1], eye[5]);
        const b = calculateDistance(eye[2], eye[4]);
        const c = calculateDistance(eye[0], eye[3]);
        if (c === 0) return 0;
        return (a + b) / (2.0 * c);
    };
    const calculateMAR = (mouth) => {
        const a = calculateDistance(mouth[1], mouth[7]);
        const b = calculateDistance(mouth[2], mouth[6]);
        const c = calculateDistance(mouth[3], mouth[5]);
        const d = calculateDistance(mouth[0], mouth[4]);
        if (d === 0) return 0;
        return (a + b + c) / (2.0 * d);
    };
    const triggerAlarm = (shouldPlay) => {
        if (alarmAudioRef.current) {
            if (shouldPlay && !isAlarming.current) {
                alarmAudioRef.current.loop = true;
                alarmAudioRef.current.play().catch(e => console.error("Audio play failed:", e));
                isAlarming.current = true;
            } else if (!shouldPlay && isAlarming.current) {
                alarmAudioRef.current.pause();
                alarmAudioRef.current.currentTime = 0;
                isAlarming.current = false;
            }
        }
    };
    
    // Emergency Contact Alert System Functions
    const sendAlertToBackend = async (alertType) => {
        if (!currentTripIdRef.current) {
            console.warn('⚠️ No trip ID yet, cannot send alert to backend');
            return;
        }
        
        console.log(`🔔 Sending alert to backend: trip_id=${currentTripIdRef.current}, type=${alertType}`);
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_BASE_URL}/api/alert`,
                {
                    trip_id: currentTripIdRef.current,
                    alert_type: alertType,
                    timestamp: new Date().toISOString()
                },
                { headers: { 'x-access-token': token } }
            );
            
            console.log('✅ Alert sent successfully:', response.data);
            
            if (response.data.emergency_notification_sent && !notificationSent) {
                console.log('🚨 EMERGENCY NOTIFICATION WAS SENT!');
                setNotificationSent(true);
            }
        } catch (error) {
            console.error('❌ Error sending alert to backend:', error);
        }
    };
    
    const trackLocalAlert = (alertType) => {
        const now = Date.now();
        setAlertTimestamps(prev => {
            const twoMinutesAgo = now - (2 * 60 * 1000);
            const recentAlerts = prev.filter(timestamp => timestamp > twoMinutesAgo);
            return [...recentAlerts, now];
        });
        
        // Send to backend
        sendAlertToBackend(alertType);
    };
    const onResults = useCallback((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const keypoints = results.multiFaceLandmarks[0];
            const leftEye = [362, 385, 387, 263, 373, 380].map(i => keypoints[i]);
            const rightEye = [33, 160, 158, 133, 153, 144].map(i => keypoints[i]);
            const mouth = [61, 76, 62, 292, 291, 306, 409, 324].map(i => keypoints[i]);
            const ear = (calculateEAR(leftEye) + calculateEAR(rightEye)) / 2.0;
            const mar = calculateMAR(mouth);

            if (ear < EAR_THRESHOLD) {
                earCounter.current++;
                if (earCounter.current >= EAR_CONSEC_FRAMES) {
                    if (!isAlarming.current) {
                        setAlertCount(prev => prev + 1);
                        console.log('😴 Drowsiness detected! Tracking alert...');
                        trackLocalAlert('drowsy'); // Send to backend
                    }
                    triggerAlarm(true);
                }
            } else {
                triggerAlarm(false);
                earCounter.current = 0;
            }
            if (mar > MAR_THRESHOLD) {
                yawnCounter.current++;
                if (yawnCounter.current >= YAWN_CONSEC_FRAMES && !isYawning.current) {
                    setYawnCount(prev => prev + 1);
                    console.log('🥱 Yawn detected! Tracking alert...');
                    trackLocalAlert('yawn'); // Send to backend
                    isYawning.current = true;
                }
            } else {
                isYawning.current = false;
                yawnCounter.current = 0;
            }
        } else {
            triggerAlarm(false);
        }
    }, []);
    useEffect(() => {
        const loadResources = async () => {
            try {
                setStatusText("Loading AI Model...");
                
                // Import FaceMesh with proper CDN configuration
                const faceMesh = new FaceMesh({ 
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` 
                });
                
                faceMesh.setOptions({ 
                    maxNumFaces: 1, 
                    refineLandmarks: true, // Disable to speed up loading
                    minDetectionConfidence: 0.5, 
                    minTrackingConfidence: 0.5 
                });
                
                faceMesh.onResults(onResults);
                faceMeshRef.current = faceMesh;
                
                setStatusText("Accessing camera...");
                const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadeddata = () => {
                        setIsLoading(false);
                        setStatusText("Ready to start trip.");
                    };
                }
            } catch (error) {
                console.error("Initialization failed:", error);
                setStatusText("Error: Could not access camera or load model.");
            }
        };
        loadResources();
        return () => {
            if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [onResults]);
    useEffect(() => {
        const animate = async () => {
            if (videoRef.current && videoRef.current.readyState >= 3) {
                await faceMeshRef.current.send({ image: videoRef.current });
            }
            animationFrameId.current = requestAnimationFrame(animate);
        };
        if (isTripStarted) animationFrameId.current = requestAnimationFrame(animate);
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [isTripStarted]);

    // --- Trip Management & Routing ---
    const handleStartNavigation = async () => {
        setIsTripStarted(true);
        setStartTime(Date.now());
        
        // Reset emergency alert tracking
        currentTripIdRef.current = null; // Clear any previous trip ID
        setAlertTimestamps([]);
        setNotificationSent(false);
        
        // Create trip record immediately to get trip_id
        try {
            const token = localStorage.getItem('token');
            const tripData = { 
                start_location: startLocationRef.current.value, 
                end_location: endLocationRef.current.value, 
                duration_seconds: 0, // Will be updated at trip end
                yawn_count: 0, 
                alert_count: 0 
            };
            
            console.log('🚗 Creating trip...', tripData);
            
            const response = await axios.post(`${API_BASE_URL}/api/trips`, tripData, { 
                headers: { 'x-access-token': token } 
            });
            
            console.log('✅ Trip created:', response.data);
            
            if (response.data.trip_id) {
                currentTripIdRef.current = response.data.trip_id;
                console.log(`📝 Trip ID stored in ref: ${currentTripIdRef.current}`);
            } else {
                console.error('❌ No trip_id in response!');
            }
        } catch (error) { 
            console.error("❌ Failed to create trip", error); 
        }
    
        // This function handles the device's compass heading (for mobile)
        const handleDeviceOrientation = (event) => {
            if (event.webkitCompassHeading) { // For iOS
                setCurrentHeading(event.webkitCompassHeading);
            } else if (event.alpha) { // For Android
                setCurrentHeading(360 - event.alpha);
            }
        };
    
        // Add the listener if the API is available
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleDeviceOrientation);
        }
    
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const newPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                setCurrentPosition(newPos);
                // Use geolocation heading if available (when moving)
                if (position.coords.heading != null) {
                    setCurrentHeading(position.coords.heading);
                }
                if (mapRef.current) {
                    mapRef.current.moveCamera({ center: newPos, heading: currentHeading, tilt: 45, zoom: 18 });
                }
            },
            (error) => console.error("Error watching position:", error),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    const handleEndTrip = async () => {
        setIsTripStarted(false);
        triggerAlarm(false);
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        // Remove the orientation listener
        window.removeEventListener('deviceorientation', () => {});
        
        const duration_seconds = Math.round((Date.now() - startTime) / 1000);
        
        // Update the existing trip with final data
        // Note: alert_count is already updated in real-time by /api/alert endpoint
        if (currentTripIdRef.current) {
            try {
                const token = localStorage.getItem('token');
                const updateData = { 
                    duration_seconds, 
                    yawn_count: yawnCount
                    // alert_count is NOT sent - it's already tracked in real-time
                };
                await axios.put(`${API_BASE_URL}/api/trips/${currentTripIdRef.current}`, updateData, { 
                    headers: { 'x-access-token': token } 
                });
            } catch (error) { 
                console.error("Failed to update trip", error); 
            }
        }
        
        // Clear the trip ID ref
        currentTripIdRef.current = null;
        console.log('🧹 Trip ID ref cleared');
        
        onTripEnd();
    };

    const handleShowRoute = async () => {
        if (startLocationRef.current.value === '' || endLocationRef.current.value === '') {
            return;
        }
        setIsCalculatingRoute(true);
        const directionsService = new window.google.maps.DirectionsService();
        try {
            const results = await directionsService.route({
                origin: startLocationRef.current.value,
                destination: endLocationRef.current.value,
                travelMode: window.google.maps.TravelMode.DRIVING,
            });
            setDirectionsResponse(results);
            setIsRouteVisible(true);
        } catch (error) {
            console.error("Error calculating route:", error);
            alert("Could not calculate the route. Please check the locations.");
        } finally {
            setIsCalculatingRoute(false);
        }
    };
    
    const handleUseCurrentLocation = () => {
         navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latLng = { lat: position.coords.latitude, lng: position.coords.longitude };
                const geocoder = new window.google.maps.Geocoder();
                try {
                    const { results } = await geocoder.geocode({ location: latLng });
                    if (results[0] && startLocationRef.current) {
                        startLocationRef.current.value = results[0].formatted_address;
                    }
                } catch(e) {
                     console.error("Geocoder failed:", e);
                }
            },
            (error) => console.warn("Could not get user location.", error)
        );
    };
    
    if (loadError) return <div>Error loading maps. Please check your API key and billing setup.</div>;
    if (!isLoaded) return <div>Loading Maps...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.mapWrapper}>
                <GoogleMap
                    onLoad={(map) => { mapRef.current = map; }}
                    mapContainerStyle={styles.map}
                    center={DEFAULT_MAP_CENTER}
                    zoom={17}
                    options={{
                        disableDefaultUI: true,
                        zoomControl: true,
                        mapId: process.env.REACT_APP_GOOGLE_MAPS_MAP_ID,
                    }}
                >
                    {directionsResponse && <DirectionsRenderer directions={directionsResponse} options={{ polylineOptions: { strokeColor: '#0d8ce6', strokeWeight: 6 } }}/>}
                    {currentPosition && (
                        <Marker 
                            position={currentPosition}
                            icon={{
                                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                scale: 7,
                                rotation: currentHeading,
                                fillColor: "#4285F4",
                                fillOpacity: 1,
                                strokeColor: "white",
                                strokeWeight: 2,
                            }}
                        />
                    )}
                </GoogleMap>
            </div>
            <div style={styles.rightColumn}>
                <div style={styles.statsContainer}>
                    <h2 style={styles.header}>Trip Details</h2>
                    <div style={styles.locationInputContainer}>
                        <div style={styles.inputWithIcon}>
                            <Autocomplete>
                                <input type="text" placeholder="Start Location" ref={startLocationRef} style={styles.locationInput} />
                            </Autocomplete>
                            <button onClick={handleUseCurrentLocation} style={styles.iconButton} title="Use Current Location">📍</button>
                        </div>
                        <Autocomplete>
                            <input type="text" placeholder="End Location" ref={endLocationRef} style={styles.locationInput} />
                        </Autocomplete>
                         <button onClick={handleShowRoute} disabled={isCalculatingRoute} style={styles.routeButton}>
                            {isCalculatingRoute ? 'Calculating...' : 'Show Route'}
                         </button>
                    </div>
                    <div style={styles.statBox}> <p>Drowsiness Alerts</p> <span>{alertCount}</span> </div>
                    <div style={styles.statBox}> <p>Yawns Detected</p> <span>{yawnCount}</span> </div>
                    <div style={styles.spacer}></div>
                    {!isTripStarted ? (
                        <button onClick={handleStartNavigation} disabled={isLoading || !isRouteVisible} style={styles.button_start}>
                            {isLoading ? 'Initializing...' : 'Start Navigation'}
                        </button>
                    ) : (
                        <button onClick={handleEndTrip} style={styles.button_end}>End Trip</button>
                    )}
                </div>
                <div style={styles.videoContainer}>
                    <h2 style={styles.header}>Live Monitor</h2>
                    {isLoading && <div style={styles.loader}>{statusText}</div>}
                    <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
                </div>
            </div>
            
            {/* Alert Counter Overlay */}
            {isTripStarted && (() => {
                const now = Date.now();
                const twoMinutesAgo = now - (2 * 60 * 1000);
                const recentAlertCount = alertTimestamps.filter(t => t > twoMinutesAgo).length;
                
                return (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        left: '20px',
                        background: recentAlertCount >= 5 ? 'rgba(231, 76, 60, 0.95)' : 'rgba(52, 73, 94, 0.9)',
                        padding: '15px 25px',
                        borderRadius: '30px',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        animation: recentAlertCount >= 5 ? 'pulse 1.5s infinite' : 'none',
                        zIndex: 1000
                    }}>
                        {recentAlertCount >= 5 && '⚠️ '} 
                        Recent Alerts: {recentAlertCount}/5
                    </div>
                );
            })()}
            
            {/* Emergency Notification Banner */}
            {notificationSent && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(231, 76, 60, 0.98)',
                    padding: '40px',
                    borderRadius: '20px',
                    color: 'white',
                    textAlign: 'center',
                    zIndex: 9999,
                    maxWidth: '500px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    border: '3px solid white'
                }}>
                    <h2 style={{ margin: '0 0 20px 0', fontSize: '28px', fontWeight: 'bold' }}>
                        🚨 EMERGENCY ALERT
                    </h2>
                    <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '20px' }}>
                        Your emergency contacts have been notified due to excessive drowsiness detection.
                        <br /><br />
                        <strong>Please pull over to a safe location immediately and take a break.</strong>
                    </p>
                    <button 
                        onClick={() => setNotificationSent(false)}
                        style={{
                            padding: '12px 30px',
                            background: 'white',
                            color: '#e74c3c',
                            border: 'none',
                            borderRadius: '30px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '16px',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        I Understand
                    </button>
                </div>
            )}
            
            <audio ref={alarmAudioRef} src="/alarm.mp3" />
            
            {/* CSS Animation for Pulse Effect */}
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% {
                            transform: scale(1);
                            opacity: 1;
                        }
                        50% {
                            transform: scale(1.05);
                            opacity: 0.85;
                        }
                    }
                `}
            </style>
        </div>
    );
};

const styles = {
    container: { display: 'flex', flexDirection: 'row', height: '100vh', backgroundColor: '#f0f2f5' },
    mapWrapper: { flex: '0 0 60%', height: '100vh' },
    map: { width: '100%', height: '100%' },
    rightColumn: { display: 'flex', flexDirection: 'column', flex: '1 1 40%', padding: '20px', gap: '20px', maxHeight: '100vh' },
    statsContainer: {
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        overflowY: 'auto',
        minHeight: 0,
    },
    videoContainer: {
        flex: '0 0 40%',
        position: 'relative',
        background: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        minHeight: '300px'
    },
    video: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
    loader: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: '1.5rem', zIndex: 10 },
    header: { marginTop: 0, color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' },
    statBox: { background: '#f8f9fa', padding: '15px', borderRadius: '8px', textAlign: 'center' },
    locationInputContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
    inputWithIcon: { position: 'relative', display: 'flex', alignItems: 'center' },
    locationInput: { padding: '12px', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '5px', width: '100%' },
    iconButton: { position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '5px' },
    routeButton: { padding: '12px', fontSize: '1rem', cursor: 'pointer', border: 'none', borderRadius: '5px', backgroundColor: '#007bff', color: 'white' },
    spacer: { flex: '1 1 auto' },
    button_start: { padding: '15px', fontSize: '1rem', cursor: 'pointer', border: 'none', borderRadius: '5px', backgroundColor: '#28a745', color: 'white', fontWeight: 'bold' },
    button_end: { padding: '15px', fontSize: '1rem', cursor: 'pointer', border: 'none', borderRadius: '5px', backgroundColor: '#dc3545', color: 'white', fontWeight: 'bold' },
};

export default TripMonitor;

