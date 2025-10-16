import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLoginSuccess, onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://127.0.0.1:5000/api/login', { email, password });
            localStorage.setItem('token', res.data.token);
            onLoginSuccess();
        } catch (err) {
            setError('Invalid credentials. Please try again.');
            console.error(err);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.authCard}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Welcome Back</h1>
                    <p style={styles.subtitle}>Log in to access your DriveGuard dashboard.</p>
                </div>
                <form onSubmit={handleSubmit} style={styles.form}>
                    {error && <p style={styles.error}>{error}</p>}
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <button type="submit" style={styles.button}>Login Securely</button>
                </form>
                <div style={styles.footer}>
                    <p>Don't have an account? <span onClick={onSwitchToRegister} style={styles.link}>Sign Up</span></p>
                </div>
            </div>
        </div>
    );
};

const styles = {
    page: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to right, #0f2027, #203a43, #2c5364)',
        color: '#f0f2f5',
        fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
        animation: 'fadeIn 1s ease-in-out',
    },
    authCard: {
        width: '400px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '40px',
        borderRadius: '15px',
        textAlign: 'center',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    },
    header: {
        marginBottom: '30px',
    },
    title: {
        margin: 0,
        fontSize: '2.5rem',
        fontWeight: '600',
    },
    subtitle: {
        margin: '10px 0 0 0',
        color: '#bdc3c7',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    input: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '8px',
        padding: '15px',
        color: '#fff',
        fontSize: '1rem',
    },
    button: {
        background: '#4CAF50',
        color: 'white',
        border: 'none',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.3s',
    },
    error: {
        color: '#ff4d4d',
        marginBottom: '10px',
    },
    footer: {
        marginTop: '30px',
        color: '#bdc3c7',
    },
    link: {
        color: '#4CAF50',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
};

export default Login;

