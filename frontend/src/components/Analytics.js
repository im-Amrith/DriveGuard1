import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// SVG Icons
const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);

const Analytics = ({ onBack }) => {
    const [period, setPeriod] = useState('daily');
    const [summary, setSummary] = useState(null);
    const [trends, setTrends] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-access-token': token };

            const [summaryRes, trendsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/analytics/summary`, { headers }),
                axios.get(`${API_BASE_URL}/api/analytics/trends?period=${period}`, { headers })
            ]);

            setSummary(summaryRes.data);
            setTrends(trendsRes.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatLabel = (label) => {
        if (period === 'daily') {
            const date = new Date(label);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (period === 'weekly') {
            return label.replace('W', 'Week ');
        } else {
            const [year, month] = label.split('-');
            const date = new Date(year, parseInt(month) - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
    };

    // Chart data configurations
    const alertsChartData = trends ? {
        labels: trends.labels.map(formatLabel),
        datasets: [{
            label: 'Alerts',
            data: trends.alerts,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4
        }]
    } : null;

    const yawnsChartData = trends ? {
        labels: trends.labels.map(formatLabel),
        datasets: [{
            label: 'Yawns',
            data: trends.yawns,
            borderColor: 'rgb(251, 191, 36)',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            fill: true,
            tension: 0.4
        }]
    } : null;

    const tripsChartData = trends ? {
        labels: trends.labels.map(formatLabel),
        datasets: [{
            label: 'Number of Trips',
            data: trends.trips,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
        }]
    } : null;

    const safetyScoreChartData = trends ? {
        labels: trends.labels.map(formatLabel),
        datasets: [{
            label: 'Safety Score',
            data: trends.safety_scores,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4
        }]
    } : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#f0f2f5',
                    font: {
                        size: 12
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#bdc3c7'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: '#bdc3c7'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            }
        }
    };

    const safetyScoreOptions = {
        ...chartOptions,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    color: '#bdc3c7'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: '#bdc3c7'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            }
        }
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <div style={styles.loadingText}>Loading analytics...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <button onClick={onBack} style={styles.backButton}>
                        <BackIcon />
                        <span style={{ marginLeft: '8px' }}>Back to Dashboard</span>
                    </button>
                    <h1 style={styles.title}>📊 Trip Analytics</h1>
                </div>

                {/* Period Selector */}
                <div style={styles.periodSelector}>
                    <button
                        style={period === 'daily' ? styles.periodButtonActive : styles.periodButton}
                        onClick={() => setPeriod('daily')}
                    >
                        Daily
                    </button>
                    <button
                        style={period === 'weekly' ? styles.periodButtonActive : styles.periodButton}
                        onClick={() => setPeriod('weekly')}
                    >
                        Weekly
                    </button>
                    <button
                        style={period === 'monthly' ? styles.periodButtonActive : styles.periodButton}
                        onClick={() => setPeriod('monthly')}
                    >
                        Monthly
                    </button>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div style={styles.summaryGrid}>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryValue}>{summary.total_trips}</div>
                            <div style={styles.summaryLabel}>Total Trips</div>
                        </div>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryValue}>
                                {Math.floor(summary.total_duration / 3600)}h {Math.floor((summary.total_duration % 3600) / 60)}m
                            </div>
                            <div style={styles.summaryLabel}>Total Duration</div>
                        </div>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryValue}>{summary.total_alerts}</div>
                            <div style={styles.summaryLabel}>Total Alerts</div>
                        </div>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryValue}>{summary.total_yawns}</div>
                            <div style={styles.summaryLabel}>Total Yawns</div>
                        </div>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryValue}>{summary.avg_alerts_per_trip}</div>
                            <div style={styles.summaryLabel}>Avg Alerts/Trip</div>
                        </div>
                        <div style={styles.summaryCard}>
                            <div style={styles.summaryValue}>{summary.avg_yawns_per_trip}</div>
                            <div style={styles.summaryLabel}>Avg Yawns/Trip</div>
                        </div>
                    </div>
                )}

                {/* Driver Safety Score - Prominent Display */}
                {summary && (
                    <div style={styles.safetyScoreContainer}>
                        <h2 style={styles.safetyScoreTitle}>Driver Safety Score</h2>
                        <div style={{
                            ...styles.safetyScoreCircle,
                            background: summary.overall_safety_score >= 90 ? 'linear-gradient(135deg, #2ecc71, #27ae60)' :
                                        summary.overall_safety_score >= 75 ? 'linear-gradient(135deg, #f39c12, #e67e22)' :
                                        summary.overall_safety_score >= 60 ? 'linear-gradient(135deg, #e67e22, #d35400)' :
                                        'linear-gradient(135deg, #e74c3c, #c0392b)'
                        }}>
                            <div style={styles.safetyScoreValue}>
                                {summary.overall_safety_score}
                            </div>
                        </div>
                        <p style={styles.safetyScoreDescription}>
                            {summary.overall_safety_score >= 90 ? '🌟 Excellent! You\'re a very safe driver.' :
                             summary.overall_safety_score >= 75 ? '👍 Good job! Keep improving your driving habits.' :
                             summary.overall_safety_score >= 60 ? '⚠️ Fair. Try to reduce alerts and yawns during trips.' :
                             '🚨 Needs improvement. Take breaks and stay alert while driving.'}
                        </p>
                        <p style={styles.safetyScoreSubtext}>
                            Based on your overall driving performance.
                        </p>
                    </div>
                )}

                {/* Charts */}
                {trends && trends.labels.length > 0 ? (
                    <div style={styles.chartsContainer}>
                        {/* Safety Score Trend */}
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Safety Score Trend</h3>
                            <div style={styles.chartWrapper}>
                                <Line data={safetyScoreChartData} options={safetyScoreOptions} />
                            </div>
                        </div>

                        {/* Alerts Over Time */}
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Alerts Over Time</h3>
                            <div style={styles.chartWrapper}>
                                <Line data={alertsChartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Yawns Over Time */}
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Yawns Over Time</h3>
                            <div style={styles.chartWrapper}>
                                <Line data={yawnsChartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Trip Frequency */}
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Trip Frequency</h3>
                            <div style={styles.chartWrapper}>
                                <Bar data={tripsChartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.noDataMessage}>
                        <p>No trip data available for the selected period.</p>
                        <p>Start monitoring your trips to see analytics!</p>
                    </div>
                )}
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
        padding: '40px'
    },
    container: {
        maxWidth: '1400px',
        margin: '0 auto'
    },
    header: {
        marginBottom: '32px'
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '30px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        color: '#f0f2f5',
        marginBottom: '20px',
        transition: 'background-color 0.3s, transform 0.2s'
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: '600',
        color: '#f0f2f5',
        margin: 0
    },
    periodSelector: {
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        padding: '8px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '15px',
        width: 'fit-content'
    },
    periodButton: {
        padding: '10px 24px',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        backgroundColor: 'transparent',
        color: '#bdc3c7',
        transition: 'all 0.2s'
    },
    periodButtonActive: {
        padding: '10px 24px',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        background: 'rgba(76, 175, 80, 0.3)',
        color: '#4CAF50',
        boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
    },
    summaryCard: {
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        textAlign: 'center'
    },
    summaryValue: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#4CAF50',
        marginBottom: '8px'
    },
    summaryLabel: {
        fontSize: '14px',
        color: '#bdc3c7',
        fontWeight: '500'
    },
    chartsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '24px'
    },
    chartCard: {
        padding: '24px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '15px'
    },
    safetyScoreContainer: {
        padding: '40px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(76, 175, 80, 0.3)',
        borderRadius: '20px',
        textAlign: 'center',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
    },
    safetyScoreTitle: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#f0f2f5',
        marginBottom: '24px',
        marginTop: '0'
    },
    safetyScoreCircle: {
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        margin: '0 auto 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        border: '5px solid rgba(255, 255, 255, 0.2)'
    },
    safetyScoreValue: {
        fontSize: '72px',
        fontWeight: '800',
        color: '#ffffff',
        textShadow: '2px 2px 8px rgba(0, 0, 0, 0.3)'
    },
    safetyScoreDescription: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#ecf0f1',
        marginBottom: '8px'
    },
    safetyScoreSubtext: {
        fontSize: '14px',
        color: '#95a5a6',
        fontStyle: 'italic'
    },
    chartTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#f0f2f5',
        marginBottom: '20px',
        marginTop: 0
    },
    chartWrapper: {
        height: '300px',
        position: 'relative'
    },
    loadingText: {
        textAlign: 'center',
        fontSize: '18px',
        color: '#bdc3c7',
        padding: '60px 0'
    },
    noDataMessage: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#bdc3c7',
        fontSize: '16px'
    }
};

export default Analytics;
