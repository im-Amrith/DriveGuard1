import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import './App.css';

// Use environment variable for the API URL, with a fallback for local development
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [view, setView] = useState('login');
    const [trips, setTrips] = useState([]);
    const [isLoadingTrips, setIsLoadingTrips] = useState(true);

    const fetchTrips = async () => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) return;

        setIsLoadingTrips(true);
        try {
            const res = await axios.get(`${API_URL}/api/trips`, {
                headers: { 'x-access-token': storedToken }
            });
            if (res.data && Array.isArray(res.data.trips)) {
                setTrips(res.data.trips.reverse());
            }
        } catch (error) {
            console.error("Could not fetch trips", error);
            if (error.response && error.response.status === 401) {
                handleLogout();
            }
        } finally {
            setIsLoadingTrips(false);
        }
    };

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

