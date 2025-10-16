import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import './App.css';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [view, setView] = useState('login');
    const [trips, setTrips] = useState([]);
    const [isLoadingTrips, setIsLoadingTrips] = useState(true); // New loading state

    // Central function to fetch trip data
    const fetchTrips = async () => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) return;

        setIsLoadingTrips(true); // Start loading
        try {
            const res = await axios.get('http://127.0.0.1:5000/api/trips', {
                headers: { 'x-access-token': storedToken }
            });
            // *** FIX: Access the 'trips' array inside the response data ***
            if (res.data && Array.isArray(res.data.trips)) {
                setTrips(res.data.trips.reverse());
            }
        } catch (error) {
            console.error("Could not fetch trips", error);
            if (error.response && error.response.status === 401) {
                handleLogout();
            }
        } finally {
            setIsLoadingTrips(false); // Stop loading
        }
    };

    // This effect runs only when the token changes
    useEffect(() => {
        if (token) {
            fetchTrips();
        }
    }, [token]);

    const handleLoginSuccess = () => {
        const storedToken = localStorage.getItem('token');
        setToken(storedToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setTrips([]);
        setView('login');
    };

    if (token) {
        // Pass the trips, loading state, and refresh function to Home
        return <Home trips={trips} isLoadingTrips={isLoadingTrips} onLogout={handleLogout} refreshTrips={fetchTrips} />;
    }

    switch (view) {
        case 'register':
            return <Register onRegisterSuccess={() => setView('login')} onSwitchToLogin={() => setView('login')} />;
        default:
            return <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setView('register')} />;
    }
}

export default App;

