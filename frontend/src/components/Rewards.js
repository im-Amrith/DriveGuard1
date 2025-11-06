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

const TrophyIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
        <path d="M4 22h16"></path>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
    </svg>
);

const Rewards = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('achievements');
    const [achievements, setAchievements] = useState([]);
    const [badges, setBadges] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [storeItems, setStoreItems] = useState([]);
    const [redemptions, setRedemptions] = useState([]);
    const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
    const [leaderboard, setLeaderboard] = useState({ by_points: [], by_safety_score: [] });
    const [userStats, setUserStats] = useState(null);
    const [leaderboardView, setLeaderboardView] = useState('points');
    const [loading, setLoading] = useState(true);
    const [redeemLoading, setRedeemLoading] = useState(false);

    useEffect(() => {
        fetchRewardsData();
    }, []);

    const fetchRewardsData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-access-token': token };

            const [achievementsRes, badgesRes, challengesRes, storeRes, streakRes, leaderboardRes, statsRes, redemptionsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/achievements`, { headers }),
                axios.get(`${API_BASE_URL}/api/gamification/badges`, { headers }),
                axios.get(`${API_BASE_URL}/api/gamification/challenges`, { headers }),
                axios.get(`${API_BASE_URL}/api/gamification/store`, { headers }),
                axios.get(`${API_BASE_URL}/api/gamification/streak`, { headers }),
                axios.get(`${API_BASE_URL}/api/leaderboard`, { headers }),
                axios.get(`${API_BASE_URL}/api/user/stats`, { headers }),
                axios.get(`${API_BASE_URL}/api/gamification/redemptions`, { headers })
            ]);

            setAchievements(achievementsRes.data.achievements);
            setBadges(badgesRes.data.badges);
            setChallenges(challengesRes.data.challenges);
            setStoreItems(storeRes.data.items);
            setStreak(streakRes.data);
            setLeaderboard(leaderboardRes.data);
            setUserStats(statsRes.data);
            setRedemptions(redemptionsRes.data.redemptions);
        } catch (error) {
            console.error('Error fetching rewards data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async (itemId) => {
        if (redeemLoading) return;
        
        setRedeemLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'x-access-token': token };

            const response = await axios.post(
                `${API_BASE_URL}/api/gamification/redeem`,
                { item_id: itemId },
                { headers }
            );

            alert(`✅ ${response.data.message}\nRemaining Points: ${response.data.remaining_points}`);
            
            // Refresh data
            await fetchRewardsData();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to redeem item';
            alert(`❌ ${message}`);
        } finally {
            setRedeemLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.container}>
                    <div style={styles.loadingText}>Loading rewards...</div>
                </div>
            </div>
        );
    }

    const earnedAchievements = achievements.filter(a => a.is_earned);
    const lockedAchievements = achievements.filter(a => !a.is_earned);

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <button onClick={onBack} style={styles.backButton}>
                        <BackIcon />
                        <span style={{ marginLeft: '8px' }}>Back to Dashboard</span>
                    </button>
                    <h1 style={styles.title}>🏆 Rewards & Achievements</h1>
                </div>

                {/* User Stats Card */}
                {userStats && (
                    <div style={styles.statsCard}>
                        <div style={styles.statItem}>
                            <div style={styles.statIcon}>⭐</div>
                            <div>
                                <div style={styles.statValue}>{userStats.points}</div>
                                <div style={styles.statLabel}>Total Points</div>
                            </div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statIcon}>🏅</div>
                            <div>
                                <div style={styles.statValue}>{userStats.achievements_earned}/{achievements.length}</div>
                                <div style={styles.statLabel}>Achievements</div>
                            </div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statIcon}>�</div>
                            <div>
                                <div style={styles.statValue}>{streak.current_streak} days</div>
                                <div style={styles.statLabel}>Current Streak</div>
                            </div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statIcon}>🏆</div>
                            <div>
                                <div style={styles.statValue}>{streak.longest_streak} days</div>
                                <div style={styles.statLabel}>Longest Streak</div>
                            </div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statIcon}>�🛡️</div>
                            <div>
                                <div style={styles.statValue}>{userStats.avg_safety_score}</div>
                                <div style={styles.statLabel}>Avg Safety Score</div>
                            </div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statIcon}>🚗</div>
                            <div>
                                <div style={styles.statValue}>{userStats.total_trips}</div>
                                <div style={styles.statLabel}>Total Trips</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div style={styles.tabs}>
                    <button
                        style={activeTab === 'achievements' ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab('achievements')}
                    >
                        Achievements
                    </button>
                    <button
                        style={activeTab === 'badges' ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab('badges')}
                    >
                        Badges
                    </button>
                    <button
                        style={activeTab === 'challenges' ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab('challenges')}
                    >
                        Challenges
                    </button>
                    <button
                        style={activeTab === 'store' ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab('store')}
                    >
                        🛒 Store
                    </button>
                    <button
                        style={activeTab === 'leaderboard' ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab('leaderboard')}
                    >
                        Leaderboard
                    </button>
                </div>

                {/* Achievements Tab */}
                {activeTab === 'achievements' && (
                    <div>
                        {/* Earned Achievements */}
                        {earnedAchievements.length > 0 && (
                            <div style={styles.section}>
                                <h2 style={styles.sectionTitle}>Earned ({earnedAchievements.length})</h2>
                                <div style={styles.achievementsGrid}>
                                    {earnedAchievements.map(achievement => (
                                        <div key={achievement.id} style={styles.achievementCard}>
                                            <div style={styles.achievementIcon}>{achievement.icon}</div>
                                            <div style={styles.achievementName}>{achievement.name}</div>
                                            <div style={styles.achievementDesc}>{achievement.description}</div>
                                            <div style={styles.earnedBadge}>
                                                ✓ Earned {new Date(achievement.earned_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Locked Achievements */}
                        {lockedAchievements.length > 0 && (
                            <div style={styles.section}>
                                <h2 style={styles.sectionTitle}>Locked ({lockedAchievements.length})</h2>
                                <div style={styles.achievementsGrid}>
                                    {lockedAchievements.map(achievement => (
                                        <div key={achievement.id} style={styles.achievementCardLocked}>
                                            <div style={styles.achievementIconLocked}>{achievement.icon}</div>
                                            <div style={styles.achievementName}>{achievement.name}</div>
                                            <div style={styles.achievementDesc}>{achievement.description}</div>
                                            <div style={styles.lockedBadge}>🔒 Locked</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Badges Tab */}
                {activeTab === 'badges' && (
                    <div>
                        {badges.filter(b => b.is_earned).length > 0 && (
                            <div style={styles.section}>
                                <h2 style={styles.sectionTitle}>Earned Badges ({badges.filter(b => b.is_earned).length})</h2>
                                <div style={styles.achievementsGrid}>
                                    {badges.filter(b => b.is_earned).map(badge => (
                                        <div key={badge.id} style={styles.achievementCard}>
                                            <div style={styles.achievementIcon}>{badge.icon}</div>
                                            <div style={styles.achievementName}>{badge.name}</div>
                                            <div style={styles.achievementDesc}>{badge.description}</div>
                                            <div style={styles.earnedBadge}>
                                                ✓ Earned {new Date(badge.earned_at).toLocaleDateString()}
                                            </div>
                                            {badge.points_reward > 0 && (
                                                <div style={styles.pointsBadge}>+{badge.points_reward} points</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {badges.filter(b => !b.is_earned).length > 0 && (
                            <div style={styles.section}>
                                <h2 style={styles.sectionTitle}>Locked Badges ({badges.filter(b => !b.is_earned).length})</h2>
                                <div style={styles.achievementsGrid}>
                                    {badges.filter(b => !b.is_earned).map(badge => (
                                        <div key={badge.id} style={styles.achievementCardLocked}>
                                            <div style={styles.achievementIconLocked}>{badge.icon}</div>
                                            <div style={styles.achievementName}>{badge.name}</div>
                                            <div style={styles.achievementDesc}>{badge.description}</div>
                                            <div style={styles.lockedBadge}>🔒 Locked</div>
                                            {badge.points_reward > 0 && (
                                                <div style={styles.pointsBadge}>+{badge.points_reward} points</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Challenges Tab */}
                {activeTab === 'challenges' && (
                    <div>
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>Active Challenges</h2>
                            {challenges.length === 0 ? (
                                <div style={styles.emptyState}>No active challenges at the moment. Check back soon!</div>
                            ) : (
                                <div style={styles.challengesGrid}>
                                    {challenges.map(challenge => (
                                        <div key={challenge.id} style={challenge.completed ? styles.challengeCardCompleted : styles.challengeCard}>
                                            <div style={styles.challengeHeader}>
                                                <div style={styles.challengeName}>{challenge.name}</div>
                                                <div style={styles.challengeType}>{challenge.challenge_type}</div>
                                            </div>
                                            <div style={styles.challengeDesc}>{challenge.description}</div>
                                            
                                            {/* Progress Bar */}
                                            <div style={styles.progressContainer}>
                                                <div style={styles.progressBar}>
                                                    <div style={{
                                                        ...styles.progressFill,
                                                        width: `${Math.min(100, (challenge.progress / challenge.criteria_value) * 100)}%`
                                                    }}></div>
                                                </div>
                                                <div style={styles.progressText}>
                                                    {challenge.progress} / {challenge.criteria_value}
                                                </div>
                                            </div>

                                            <div style={styles.challengeFooter}>
                                                <div style={styles.challengeReward}>🏆 {challenge.points_reward} points</div>
                                                {challenge.completed ? (
                                                    <div style={styles.completedBadge}>✓ Completed</div>
                                                ) : (
                                                    <div style={styles.endDate}>
                                                        Ends: {new Date(challenge.end_date).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Store Tab */}
                {activeTab === 'store' && (
                    <div>
                        <div style={styles.section}>
                            <h2 style={styles.sectionTitle}>Points Store - {userStats?.points || 0} points available</h2>
                            {storeItems.length === 0 ? (
                                <div style={styles.emptyState}>No items available in the store yet.</div>
                            ) : (
                                <div style={styles.storeGrid}>
                                    {storeItems.map(item => (
                                        <div key={item.id} style={item.can_afford && item.in_stock ? styles.storeCard : styles.storeCardDisabled}>
                                            <div style={styles.storeIcon}>{item.icon}</div>
                                            <div style={styles.storeName}>{item.name}</div>
                                            <div style={styles.storeDesc}>{item.description}</div>
                                            <div style={styles.storeCategory}>{item.category}</div>
                                            <div style={styles.storeCost}>💎 {item.points_cost} points</div>
                                            
                                            {!item.in_stock && (
                                                <div style={styles.outOfStock}>Out of Stock</div>
                                            )}
                                            
                                            {item.in_stock && (
                                                <button
                                                    onClick={() => handleRedeem(item.id)}
                                                    disabled={!item.can_afford || redeemLoading}
                                                    style={item.can_afford ? styles.redeemButton : styles.redeemButtonDisabled}
                                                >
                                                    {redeemLoading ? 'Processing...' : item.can_afford ? 'Redeem' : 'Not Enough Points'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Redemption History */}
                        {redemptions.length > 0 && (
                            <div style={styles.section}>
                                <h2 style={styles.sectionTitle}>Redemption History</h2>
                                <div style={styles.redemptionList}>
                                    {redemptions.slice(0, 5).map(redemption => (
                                        <div key={redemption.id} style={styles.redemptionItem}>
                                            <div style={styles.redemptionIcon}>{redemption.item_icon}</div>
                                            <div style={styles.redemptionDetails}>
                                                <div style={styles.redemptionName}>{redemption.item_name}</div>
                                                <div style={styles.redemptionDate}>
                                                    {new Date(redemption.redeemed_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div style={styles.redemptionCost}>-{redemption.points_spent} pts</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Leaderboard Tab */}
                {activeTab === 'leaderboard' && (
                    <div>
                        {/* Leaderboard Toggle */}
                        <div style={styles.leaderboardToggle}>
                            <button
                                style={leaderboardView === 'points' ? styles.toggleButtonActive : styles.toggleButton}
                                onClick={() => setLeaderboardView('points')}
                            >
                                By Points
                            </button>
                            <button
                                style={leaderboardView === 'safety' ? styles.toggleButtonActive : styles.toggleButton}
                                onClick={() => setLeaderboardView('safety')}
                            >
                                By Safety Score
                            </button>
                        </div>

                        {/* Leaderboard List */}
                        <div style={styles.leaderboardList}>
                            {(leaderboardView === 'points' ? leaderboard.by_points : leaderboard.by_safety_score).map((user, index) => (
                                <div
                                    key={user.user_id}
                                    style={user.is_current_user ? styles.leaderboardItemCurrent : styles.leaderboardItem}
                                >
                                    <div style={styles.rank}>
                                        {index === 0 && '🥇'}
                                        {index === 1 && '🥈'}
                                        {index === 2 && '🥉'}
                                        {index > 2 && `#${index + 1}`}
                                    </div>
                                    <div style={styles.leaderboardUser}>
                                        <div style={styles.userName}>
                                            {user.display_name}
                                            {user.is_current_user && <span style={styles.youBadge}> (You)</span>}
                                        </div>
                                        <div style={styles.userStats}>
                                            {user.total_trips} trips
                                        </div>
                                    </div>
                                    <div style={styles.leaderboardScore}>
                                        {leaderboardView === 'points' ? (
                                            <>
                                                <div style={styles.scoreValue}>{user.points}</div>
                                                <div style={styles.scoreLabel}>points</div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={styles.scoreValue}>{user.avg_safety_score}</div>
                                                <div style={styles.scoreLabel}>safety</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
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
    statsCard: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
        padding: '24px',
        background: 'rgba(76, 175, 80, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(76, 175, 80, 0.3)',
        borderRadius: '15px'
    },
    statItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
    },
    statIcon: {
        fontSize: '32px'
    },
    statValue: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#4CAF50'
    },
    statLabel: {
        fontSize: '12px',
        color: '#bdc3c7',
        textTransform: 'uppercase'
    },
    tabs: {
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        padding: '8px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '15px',
        width: 'fit-content'
    },
    tab: {
        padding: '12px 32px',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '500',
        backgroundColor: 'transparent',
        color: '#bdc3c7',
        transition: 'all 0.2s'
    },
    tabActive: {
        padding: '12px 32px',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '600',
        background: 'rgba(76, 175, 80, 0.3)',
        color: '#4CAF50',
        boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
    },
    section: {
        marginBottom: '40px'
    },
    sectionTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#f0f2f5',
        marginBottom: '20px'
    },
    achievementsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px'
    },
    achievementCard: {
        padding: '24px',
        background: 'rgba(76, 175, 80, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(76, 175, 80, 0.5)',
        borderRadius: '15px',
        textAlign: 'center',
        transition: 'transform 0.2s',
        cursor: 'pointer'
    },
    achievementCardLocked: {
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        textAlign: 'center',
        opacity: 0.6
    },
    achievementIcon: {
        fontSize: '48px',
        marginBottom: '12px'
    },
    achievementIconLocked: {
        fontSize: '48px',
        marginBottom: '12px',
        filter: 'grayscale(100%)'
    },
    achievementName: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#f0f2f5',
        marginBottom: '8px'
    },
    achievementDesc: {
        fontSize: '14px',
        color: '#bdc3c7',
        marginBottom: '12px'
    },
    earnedBadge: {
        display: 'inline-block',
        padding: '6px 12px',
        background: 'rgba(76, 175, 80, 0.3)',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#4CAF50',
        fontWeight: '600'
    },
    lockedBadge: {
        display: 'inline-block',
        padding: '6px 12px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#bdc3c7',
        fontWeight: '600'
    },
    leaderboardToggle: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        padding: '8px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '15px',
        width: 'fit-content'
    },
    toggleButton: {
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
    toggleButtonActive: {
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
    leaderboardList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    leaderboardItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        transition: 'transform 0.2s'
    },
    leaderboardItemCurrent: {
        display: 'flex',
        alignItems: 'center',
        padding: '20px',
        background: 'rgba(76, 175, 80, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(76, 175, 80, 0.5)',
        borderRadius: '15px',
        transition: 'transform 0.2s'
    },
    rank: {
        fontSize: '24px',
        fontWeight: '700',
        minWidth: '60px',
        textAlign: 'center'
    },
    leaderboardUser: {
        flex: 1,
        marginLeft: '16px'
    },
    userName: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#f0f2f5'
    },
    youBadge: {
        color: '#4CAF50',
        fontSize: '14px'
    },
    userStats: {
        fontSize: '14px',
        color: '#bdc3c7',
        marginTop: '4px'
    },
    leaderboardScore: {
        textAlign: 'right',
        marginLeft: '16px'
    },
    scoreValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#4CAF50'
    },
    scoreLabel: {
        fontSize: '12px',
        color: '#bdc3c7',
        textTransform: 'uppercase'
    },
    loadingText: {
        textAlign: 'center',
        fontSize: '18px',
        color: '#bdc3c7',
        padding: '60px 0'
    },
    // New styles for badges, challenges, and store
    pointsBadge: {
        marginTop: '8px',
        fontSize: '12px',
        color: '#FFD700',
        fontWeight: '600'
    },
    challengesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
    },
    challengeCard: {
        padding: '24px',
        background: 'rgba(66, 135, 245, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(66, 135, 245, 0.3)',
        borderRadius: '15px',
        transition: 'transform 0.2s'
    },
    challengeCardCompleted: {
        padding: '24px',
        background: 'rgba(76, 175, 80, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(76, 175, 80, 0.5)',
        borderRadius: '15px',
        transition: 'transform 0.2s'
    },
    challengeHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
    },
    challengeName: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#f0f2f5'
    },
    challengeType: {
        fontSize: '12px',
        padding: '4px 12px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        color: '#bdc3c7',
        textTransform: 'uppercase'
    },
    challengeDesc: {
        fontSize: '14px',
        color: '#bdc3c7',
        marginBottom: '16px'
    },
    progressContainer: {
        marginBottom: '16px'
    },
    progressBar: {
        width: '100%',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '8px'
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #4287f5, #42f5a7)',
        borderRadius: '4px',
        transition: 'width 0.3s ease'
    },
    progressText: {
        fontSize: '12px',
        color: '#bdc3c7',
        textAlign: 'center'
    },
    challengeFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    challengeReward: {
        fontSize: '14px',
        color: '#FFD700',
        fontWeight: '600'
    },
    completedBadge: {
        padding: '6px 12px',
        background: 'rgba(76, 175, 80, 0.3)',
        borderRadius: '12px',
        fontSize: '12px',
        color: '#4CAF50',
        fontWeight: '600'
    },
    endDate: {
        fontSize: '12px',
        color: '#bdc3c7'
    },
    storeGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px'
    },
    storeCard: {
        padding: '24px',
        background: 'rgba(255, 193, 7, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '15px',
        textAlign: 'center',
        transition: 'transform 0.2s',
        cursor: 'pointer'
    },
    storeCardDisabled: {
        padding: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        textAlign: 'center',
        opacity: 0.6
    },
    storeIcon: {
        fontSize: '48px',
        marginBottom: '12px'
    },
    storeName: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#f0f2f5',
        marginBottom: '8px'
    },
    storeDesc: {
        fontSize: '14px',
        color: '#bdc3c7',
        marginBottom: '12px'
    },
    storeCategory: {
        fontSize: '12px',
        padding: '4px 12px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        color: '#bdc3c7',
        textTransform: 'uppercase',
        display: 'inline-block',
        marginBottom: '12px'
    },
    storeCost: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#FFD700',
        marginBottom: '16px'
    },
    redeemButton: {
        width: '100%',
        padding: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        borderRadius: '10px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        ':hover': {
            transform: 'scale(1.05)'
        }
    },
    redeemButtonDisabled: {
        width: '100%',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        borderRadius: '10px',
        color: '#bdc3c7',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'not-allowed'
    },
    outOfStock: {
        padding: '8px',
        background: 'rgba(244, 67, 54, 0.2)',
        borderRadius: '8px',
        color: '#f44336',
        fontSize: '12px',
        fontWeight: '600',
        marginTop: '8px'
    },
    redemptionList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    redemptionItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px'
    },
    redemptionIcon: {
        fontSize: '32px',
        marginRight: '16px'
    },
    redemptionDetails: {
        flex: 1
    },
    redemptionName: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#f0f2f5',
        marginBottom: '4px'
    },
    redemptionDate: {
        fontSize: '12px',
        color: '#bdc3c7'
    },
    redemptionCost: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#f44336'
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px',
        fontSize: '16px',
        color: '#bdc3c7'
    }
};

export default Rewards;
