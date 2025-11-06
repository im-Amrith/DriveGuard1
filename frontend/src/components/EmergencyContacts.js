import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// SVG Icons
const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);

const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);

const MailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
);

const TrashIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);

const EmergencyContacts = ({ onBack }) => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        notification_type: 'both'
    });
    const [error, setError] = useState('');
    const [maxContacts, setMaxContacts] = useState(3);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/contacts`, {
                headers: { 'x-access-token': token }
            });
            setContacts(response.data.contacts);
            setMaxContacts(response.data.max_allowed);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }
        if (!formData.email.trim() && !formData.phone.trim()) {
            setError('At least one contact method (email or phone) is required');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/contacts`, formData, {
                headers: { 'x-access-token': token }
            });
            
            // Reset form and refresh contacts
            setFormData({ name: '', phone: '', email: '', notification_type: 'both' });
            setShowForm(false);
            fetchContacts();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to add contact');
        }
    };

    const handleDelete = async (contactId) => {
        if (window.confirm('Are you sure you want to delete this emergency contact?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_BASE_URL}/api/contacts/${contactId}`, {
                    headers: { 'x-access-token': token }
                });
                fetchContacts();
            } catch (error) {
                console.error('Error deleting contact:', error);
                alert('Failed to delete contact');
            }
        }
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <div style={styles.loadingText}>Loading emergency contacts...</div>
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
                    <h1 style={styles.title}>🆘 Emergency Contacts</h1>
                    <p style={styles.subtitle}>
                        These contacts will be notified if you show signs of severe drowsiness (more than 5 alerts within 2 minutes)
                    </p>
                </div>

                {/* Info Card */}
                <div style={styles.infoCard}>
                    <div style={styles.infoIcon}>ℹ️</div>
                    <div>
                        <strong>How it works:</strong> If the system detects excessive drowsiness alerts during your trip, 
                        your emergency contacts will receive an email with your trip details and current status.
                    </div>
                </div>

                {/* Add Contact Button */}
                {contacts.length < maxContacts && !showForm && (
                    <button onClick={() => setShowForm(true)} style={styles.addButton}>
                        + Add Emergency Contact ({contacts.length}/{maxContacts})
                    </button>
                )}

                {/* Add Contact Form */}
                {showForm && (
                    <div style={styles.formCard}>
                        <h2 style={styles.formTitle}>Add New Contact</h2>
                        {error && <div style={styles.errorMessage}>{error}</div>}
                        
                        <form onSubmit={handleSubmit}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={styles.input}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={styles.input}
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    style={styles.input}
                                    placeholder="+1 234 567 8900"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Notification Method</label>
                                <select
                                    value={formData.notification_type}
                                    onChange={(e) => setFormData({ ...formData, notification_type: e.target.value })}
                                    style={styles.select}
                                >
                                    <option value="both">Email & SMS (when available)</option>
                                    <option value="email">Email Only</option>
                                    <option value="sms">SMS Only (coming soon)</option>
                                </select>
                            </div>

                            <div style={styles.formButtons}>
                                <button type="submit" style={styles.submitButton}>Save Contact</button>
                                <button type="button" onClick={() => setShowForm(false)} style={styles.cancelButton}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Contacts List */}
                <div style={styles.contactsList}>
                    {contacts.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={styles.emptyIcon}>📞</div>
                            <p>No emergency contacts added yet</p>
                            <p style={styles.emptySubtext}>Add up to {maxContacts} contacts who can be notified in case of emergency</p>
                        </div>
                    ) : (
                        contacts.map(contact => (
                            <div key={contact.id} style={styles.contactCard}>
                                <div style={styles.contactHeader}>
                                    <div style={styles.contactName}>{contact.name}</div>
                                    <button onClick={() => handleDelete(contact.id)} style={styles.deleteButton}>
                                        <TrashIcon />
                                    </button>
                                </div>
                                <div style={styles.contactDetails}>
                                    {contact.email && (
                                        <div style={styles.contactDetail}>
                                            <MailIcon />
                                            <span style={styles.contactText}>{contact.email}</span>
                                        </div>
                                    )}
                                    {contact.phone && (
                                        <div style={styles.contactDetail}>
                                            <PhoneIcon />
                                            <span style={styles.contactText}>{contact.phone}</span>
                                        </div>
                                    )}
                                </div>
                                <div style={styles.contactBadge}>
                                    {contact.notification_type === 'both' && '📧 Email & 📱 SMS'}
                                    {contact.notification_type === 'email' && '📧 Email Only'}
                                    {contact.notification_type === 'sms' && '📱 SMS Only'}
                                </div>
                            </div>
                        ))
                    )}
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
        padding: '40px'
    },
    container: {
        maxWidth: '900px',
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
        margin: 0,
        marginBottom: '8px'
    },
    subtitle: {
        fontSize: '14px',
        color: '#bdc3c7',
        margin: 0
    },
    infoCard: {
        display: 'flex',
        gap: '16px',
        padding: '20px',
        background: 'rgba(52, 152, 219, 0.1)',
        border: '1px solid rgba(52, 152, 219, 0.3)',
        borderRadius: '12px',
        marginBottom: '24px',
        fontSize: '14px',
        color: '#f0f2f5'
    },
    infoIcon: {
        fontSize: '24px',
        flexShrink: 0
    },
    addButton: {
        width: '100%',
        padding: '16px',
        background: 'rgba(231, 76, 60, 0.2)',
        border: '2px dashed rgba(231, 76, 60, 0.5)',
        borderRadius: '12px',
        color: '#e74c3c',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        marginBottom: '24px',
        transition: 'all 0.2s'
    },
    formCard: {
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        marginBottom: '24px'
    },
    formTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#f0f2f5',
        marginTop: 0,
        marginBottom: '20px'
    },
    errorMessage: {
        padding: '12px',
        background: 'rgba(231, 76, 60, 0.2)',
        border: '1px solid rgba(231, 76, 60, 0.5)',
        borderRadius: '8px',
        color: '#e74c3c',
        marginBottom: '16px',
        fontSize: '14px'
    },
    formGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#f0f2f5'
    },
    input: {
        width: '100%',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: '#f0f2f5',
        fontSize: '14px',
        boxSizing: 'border-box'
    },
    select: {
        width: '100%',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: '#f0f2f5',
        fontSize: '14px',
        cursor: 'pointer',
        boxSizing: 'border-box'
    },
    formButtons: {
        display: 'flex',
        gap: '12px',
        marginTop: '24px'
    },
    submitButton: {
        flex: 1,
        padding: '12px',
        background: '#e74c3c',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    cancelButton: {
        flex: 1,
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: '#f0f2f5',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    contactsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    contactCard: {
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '15px'
    },
    contactHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    contactName: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#f0f2f5'
    },
    deleteButton: {
        padding: '8px',
        background: 'rgba(231, 76, 60, 0.1)',
        border: '1px solid rgba(231, 76, 60, 0.3)',
        borderRadius: '8px',
        color: '#e74c3c',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    },
    contactDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '12px'
    },
    contactDetail: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#bdc3c7'
    },
    contactText: {
        fontSize: '14px'
    },
    contactBadge: {
        display: 'inline-block',
        padding: '6px 12px',
        background: 'rgba(231, 76, 60, 0.2)',
        border: '1px solid rgba(231, 76, 60, 0.3)',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#e74c3c',
        fontWeight: '600'
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#bdc3c7'
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '16px'
    },
    emptySubtext: {
        fontSize: '14px',
        marginTop: '8px'
    },
    loadingText: {
        textAlign: 'center',
        fontSize: '18px',
        color: '#bdc3c7',
        padding: '60px 0'
    }
};

export default EmergencyContacts;
