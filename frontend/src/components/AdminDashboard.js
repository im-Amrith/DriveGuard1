import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const AdminDashboard = ({ onBack }) => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('safety_score'); // safety_score, trips, alerts

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-access-token': token };

            const [statsRes, usersRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/admin/stats`, { headers }),
                axios.get(`${API_BASE_URL}/api/admin/users`, { headers })
            ]);

            setStats(statsRes.data);
            setUsers(usersRes.data.users);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            if (error.response?.status === 403) {
                alert('Admin access required!');
                onBack();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleViewUser = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/admin/users/${userId}`, {
                headers: { 'x-access-token': token }
            });
            setSelectedUser(response.data);
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, {
                headers: { 'x-access-token': token }
            });
            alert('User deleted successfully');
            fetchAdminData();
            setSelectedUser(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    const handleToggleAdmin = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(
                `${API_BASE_URL}/api/admin/users/${userId}/toggle-admin`,
                {},
                { headers: { 'x-access-token': token } }
            );
            alert(response.data.message);
            fetchAdminData();
            if (selectedUser && selectedUser.user.id === userId) {
                setSelectedUser({
                    ...selectedUser,
                    user: { ...selectedUser.user, is_admin: response.data.is_admin }
                });
            }
        } catch (error) {
            console.error('Error toggling admin:', error);
            alert('Failed to toggle admin status');
        }
    };

    const getSafetyScoreColor = (score) => {
        if (score >= 90) return '#2ecc71';
        if (score >= 75) return '#f39c12';
        if (score >= 60) return '#e67e22';
        return '#e74c3c';
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (sortBy === 'safety_score') return b.safety_score - a.safety_score;
        if (sortBy === 'trips') return b.total_trips - a.total_trips;
        if (sortBy === 'alerts') return b.total_alerts - a.total_alerts;
        return 0;
    });

    if (loading) {
        return <div style={styles.loading}>Loading admin dashboard...</div>;
    }

    if (selectedUser) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <button onClick={() => setSelectedUser(null)} style={styles.backButton}>
                        ← Back to Users
                    </button>
                    <h1 style={styles.title}>User Details</h1>
                </div>

                <div style={styles.userDetailsCard}>
                    <div style={styles.userHeader}>
                        <div>
                            <h2>{selectedUser.user.email}</h2>
                            <p>User ID: {selectedUser.user.id} {selectedUser.user.is_admin && '👑 Admin'}</p>
                            <p>Points: {selectedUser.user.points} | Joined: {new Date(selectedUser.user.created_at).toLocaleDateString()}</p>
                        </div>
                        <div style={styles.userActions}>
                            <button 
                                onClick={() => handleToggleAdmin(selectedUser.user.id)}
                                style={styles.actionButton}
                            >
                                {selectedUser.user.is_admin ? 'Remove Admin' : 'Make Admin'}
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(selectedUser.user.id)}
                                style={styles.deleteButton}
                            >
                                Delete User
                            </button>
                        </div>
                    </div>

                    <h3>Emergency Contacts ({selectedUser.emergency_contacts.length})</h3>
                    {selectedUser.emergency_contacts.length > 0 ? (
                        <div style={styles.contactsList}>
                            {selectedUser.emergency_contacts.map(contact => (
                                <div key={contact.id} style={styles.contactCard}>
                                    <strong>{contact.name}</strong>
                                    <p>📞 {contact.phone}</p>
                                    <p>📧 {contact.email}</p>
                                    <p>Type: {contact.notification_type}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No emergency contacts</p>
                    )}

                    <h3>Trip History ({selectedUser.trips.length} trips)</h3>
                    <div style={styles.tripsTable}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                                    <th style={styles.tableHeader}>Trip ID</th>
                                    <th style={styles.tableHeader}>Route</th>
                                    <th style={styles.tableHeader}>Duration</th>
                                    <th style={styles.tableHeader}>Alerts</th>
                                    <th style={styles.tableHeader}>Yawns</th>
                                    <th style={styles.tableHeader}>Safety Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedUser.trips.map(trip => (
                                    <tr key={trip.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <td style={styles.tableCell}>
                                            #{trip.id}
                                        </td>
                                        <td style={styles.tableCell}>
                                            {trip.start_location} → {trip.end_location}
                                        </td>
                                        <td style={styles.tableCell}>
                                            {Math.floor(trip.duration_seconds / 60)}m {trip.duration_seconds % 60}s
                                        </td>
                                        <td style={styles.tableCell}>{trip.alert_count}</td>
                                        <td style={styles.tableCell}>{trip.yawn_count}</td>
                                        <td style={styles.tableCell}>
                                            <span style={{ 
                                                color: getSafetyScoreColor(trip.safety_score),
                                                fontWeight: 'bold'
                                            }}>
                                                {trip.safety_score}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={onBack} style={styles.backButton}>
                    ← Back to Home
                </button>
                <h1 style={styles.title}>👑 Admin Dashboard</h1>
            </div>

            {/* System Stats */}
            {stats && (
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{stats.total_users}</div>
                        <div style={styles.statLabel}>Total Users</div>
                        <div style={styles.statSubtext}>{stats.recent_users_24h} new (24h)</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{stats.total_trips}</div>
                        <div style={styles.statLabel}>Total Trips</div>
                        <div style={styles.statSubtext}>{stats.recent_trips_24h} recent (24h)</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{stats.total_alerts}</div>
                        <div style={styles.statLabel}>Total Alerts</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>
                            {Math.floor(stats.total_duration / 3600)}h {Math.floor((stats.total_duration % 3600) / 60)}m
                        </div>
                        <div style={styles.statLabel}>Total Driving Time</div>
                    </div>
                </div>
            )}

            {/* Users List */}
            <div style={styles.usersSection}>
                <div style={styles.usersHeader}>
                    <h2>All Users ({users.length})</h2>
                    <div style={styles.controls}>
                        <input
                            type="text"
                            placeholder="Search by email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={styles.sortSelect}
                        >
                            <option value="safety_score">Sort by Safety Score</option>
                            <option value="trips">Sort by Trips</option>
                            <option value="alerts">Sort by Alerts</option>
                        </select>
                    </div>
                </div>

                <div style={styles.usersGrid}>
                    {sortedUsers.map(user => (
                        <div key={user.id} style={styles.userCard} onClick={() => handleViewUser(user.id)}>
                            <div style={styles.userCardHeader}>
                                <h3>{user.email}</h3>
                                {user.is_admin && <span style={styles.adminBadge}>👑 Admin</span>}
                            </div>
                            
                            <div style={styles.userStats}>
                                <div style={styles.userStatItem}>
                                    <div style={{
                                        fontSize: '32px',
                                        fontWeight: 'bold',
                                        color: getSafetyScoreColor(user.safety_score)
                                    }}>
                                        {user.safety_score}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#bdc3c7' }}>Safety Score</div>
                                </div>
                                
                                <div style={styles.userStatItem}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3498db' }}>
                                        {user.total_trips}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#bdc3c7' }}>Trips</div>
                                </div>
                                
                                <div style={styles.userStatItem}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e74c3c' }}>
                                        {user.total_alerts}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#bdc3c7' }}>Alerts</div>
                                </div>
                                
                                <div style={styles.userStatItem}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>
                                        {user.total_yawns}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#bdc3c7' }}>Yawns</div>
                                </div>
                            </div>
                            
                            <div style={styles.userFooter}>
                                <span>⏱ {Math.floor(user.total_duration / 60)}m driving</span>
                                <span>📞 {user.emergency_contacts} contacts</span>
                                <span>🎯 {user.points} points</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(to right, #0f2027, #203a43, #2c5364)',
        color: '#f0f2f5',
        padding: '40px',
        fontFamily: "'Segoe UI', 'Roboto', sans-serif"
    },
    loading: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        color: '#f0f2f5',
        background: 'linear-gradient(to right, #0f2027, #203a43, #2c5364)'
    },
    header: {
        marginBottom: '32px'
    },
    backButton: {
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '8px',
        color: '#f0f2f5',
        cursor: 'pointer',
        fontSize: '14px',
        marginBottom: '16px',
        transition: 'all 0.2s'
    },
    title: {
        fontSize: '36px',
        fontWeight: '700',
        margin: '0'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
    },
    statCard: {
        padding: '24px',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '15px',
        textAlign: 'center'
    },
    statValue: {
        fontSize: '36px',
        fontWeight: '700',
        color: '#4CAF50',
        marginBottom: '8px'
    },
    statLabel: {
        fontSize: '14px',
        color: '#bdc3c7',
        marginBottom: '4px'
    },
    statSubtext: {
        fontSize: '12px',
        color: '#95a5a6',
        fontStyle: 'italic'
    },
    usersSection: {
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '15px',
        padding: '24px'
    },
    usersHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
    },
    controls: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    searchInput: {
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '8px',
        color: '#f0f2f5',
        fontSize: '14px',
        minWidth: '250px'
    },
    sortSelect: {
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '8px',
        color: '#f0f2f5',
        fontSize: '14px',
        cursor: 'pointer'
    },
    usersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
    },
    userCard: {
        padding: '20px',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
        }
    },
    userCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    adminBadge: {
        padding: '4px 12px',
        background: 'linear-gradient(135deg, #f39c12, #e67e22)',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold'
    },
    userStats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px'
    },
    userStatItem: {
        textAlign: 'center'
    },
    userFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#95a5a6',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255,255,255,0.1)'
    },
    userDetailsCard: {
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '15px',
        padding: '32px'
    },
    userHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid rgba(255,255,255,0.1)'
    },
    userActions: {
        display: 'flex',
        gap: '12px'
    },
    actionButton: {
        padding: '10px 20px',
        background: 'rgba(52, 152, 219, 0.3)',
        border: '1px solid rgba(52, 152, 219, 0.5)',
        borderRadius: '8px',
        color: '#3498db',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s'
    },
    deleteButton: {
        padding: '10px 20px',
        background: 'rgba(231, 76, 60, 0.3)',
        border: '1px solid rgba(231, 76, 60, 0.5)',
        borderRadius: '8px',
        color: '#e74c3c',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s'
    },
    contactsList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
    },
    contactCard: {
        padding: '16px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px'
    },
    tripsTable: {
        overflowX: 'auto',
        marginTop: '16px'
    },
    tableHeader: {
        padding: '12px',
        textAlign: 'left',
        fontSize: '14px',
        fontWeight: '600',
        color: '#bdc3c7'
    },
    tableCell: {
        padding: '12px',
        fontSize: '14px'
    }
};

export default AdminDashboard;
