import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Package, MapPin, Clock, Navigation, Search, RefreshCw } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../lib/api';

interface LoadRequest {
    id: string;
    cargoName: string;
    weight: string;
    weight_val: number;
    status: string;
    origin: { city: string; state: string };
    destination: { city: string; state: string };
    distance: string;
    estimatedTime: string;
    duration?: string;
    dimensions?: string;
    originCity?: string;
    originState?: string;
    destCity?: string;
    destState?: string;
}

const getStatusBadge = (weight: number) => {
    if (weight > 80000) {
        return (
            <View style={[styles.badge, styles.badgeOverweight]}>
                <Text style={styles.badgeTextOverweight}>Overweight</Text>
            </View>
        );
    }
    if (weight > 40000) {
        return (
            <View style={[styles.badge, styles.badgeHeavy]}>
                <Text style={styles.badgeTextHeavy}>Heavy Load</Text>
            </View>
        );
    }
    return (
        <View style={[styles.badge, styles.badgeStandard]}>
            <Text style={styles.badgeTextStandard}>Standard</Text>
        </View>
    );
};

export default function AvailableLoads() {
    const router = useRouter();
    const [requests, setRequests] = useState<LoadRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTrip, setActiveTrip] = useState<any>(null);
    const [lastCompletedTrip, setLastCompletedTrip] = useState<any>(null);
    const [unreadMessages, setUnreadMessages] = useState(0);


    const fetchLoads = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const [loadsResponse, activeResponse, completedResponse, messagesResponse] = await Promise.all([
                api.get("/drivers/available-loads"),
                api.get("/drivers/active-trip").catch(() => ({ data: { success: true, data: null } })),
                api.get("/drivers/history").catch(() => ({ data: { success: false, data: [] } })),
                api.get("/messages/conversations").catch(() => ({ data: { success: false, data: [] } }))
            ]);

            if (loadsResponse.data.success) {
                const mapped = loadsResponse.data.data.map((b: any) => ({
                    id: b.id,
                    cargoName: b.cargo_type,
                    weight: `${b.weight_lbs.toLocaleString()} lbs`,
                    weight_val: b.weight_lbs,
                    status: b.status,
                    origin: { city: b.pickup_city, state: b.pickup_state },
                    destination: { city: b.delivery_city, state: b.delivery_state },
                    originCity: b.pickup_city,
                    originState: b.pickup_state,
                    destCity: b.delivery_city,
                    destState: b.delivery_state,
                    distance: "Calculating...",
                    estimatedTime: b.shipment_date ? new Date(b.shipment_date).toLocaleDateString() : "TBD",
                    duration: "45m",
                    dimensions: `${b.dimensions_length_ft}' x ${b.dimensions_width_ft}' x ${b.dimensions_height_ft}'`
                }));
                setRequests(mapped);
            }

            // Set active trip
            console.log("Active trips response:", activeResponse.data);
            if (activeResponse.data.success && activeResponse.data.data) {
                console.log("Setting active trip:", activeResponse.data.data);
                setActiveTrip(activeResponse.data.data);
            } else {
                setActiveTrip(null);
            }

            // Set last completed trip
            console.log("Completed trips response:", completedResponse.data);
            if (completedResponse.data.success && completedResponse.data.data.length > 0) {
                const completed = completedResponse.data.data.filter((t: any) => t.status === 'delivered' || t.status === 'completed');
                console.log("Completed trips filtered:", completed);
                if (completed.length > 0) {
                    setLastCompletedTrip(completed[0]);
                }
            }

            // Count unread messages
            console.log("Messages response:", messagesResponse.data);
            if (messagesResponse.data.success && messagesResponse.data.data) {
                console.log("Conversations data:", messagesResponse.data.data);
                const unreadCount = messagesResponse.data.data.reduce((acc: number, conv: any) => {
                    console.log("Conv unread_count:", conv.unread_count, "Type:", typeof conv.unread_count);
                    return acc + (parseInt(conv.unread_count) || 0);
                }, 0);
                console.log("Total unread messages count:", unreadCount);
                setUnreadMessages(unreadCount);
            } else {
                setUnreadMessages(0);
            }

        } catch (error) {
            console.error("Failed to load available loads", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLoads();
    }, []);

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchLoads(true); // Silent refresh when coming back to screen
        }, [])
    );

    // Auto-refresh every 30 seconds while on this screen
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLoads(true); // Silent refresh
        }, 30000); // 30 seconds

        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    const filteredRequests = requests.filter(r =>
        r.cargoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePress = (item: any) => {
        router.push({
            pathname: `/load-details/${item.id}`,
            params: {
                id: item.id,
                cargoName: item.cargoName,
                weight: item.weight,
                originCity: item.originCity,
                originState: item.originState,
                destCity: item.destCity,
                destState: item.destState,
                distance: item.distance,
                duration: item.duration,
                dimensions: item.dimensions
            }
        });
    };

    const renderItem = ({ item }: { item: LoadRequest }) => (
        <TouchableOpacity style={styles.card} onPress={() => handlePress(item)}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                        <Text style={styles.cargoName}>{item.cargoName}</Text>
                        {getStatusBadge(item.weight_val)}
                    </View>
                    <Text style={styles.cargoId}>ID: #{item.id.split('-')[0]} • {item.weight}</Text>
                </View>
            </View>

            <View style={styles.routeContainer}>
                <View style={styles.routeItem}>
                    <View style={[styles.dot, { backgroundColor: '#44AEBC' }]} />
                    <View>
                        <Text style={styles.routeLabel}>PICKUP</Text>
                        <Text style={styles.routeText}>{item.origin.city}, {item.origin.state}</Text>
                    </View>
                </View>
                <View style={styles.connector} />
                <View style={styles.routeItem}>
                    <View style={[styles.dot, { backgroundColor: '#64748b' }]} />
                    <View>
                        <Text style={styles.routeLabel}>DELIVERY</Text>
                        <Text style={styles.routeText}>{item.destination.city}, {item.destination.state}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.footerInfo}>
                    <Clock size={14} stroke="#64748b" />
                    <Text style={styles.footerText}>{item.estimatedTime}</Text>
                </View>
                <View style={styles.detailsButton}>
                    <Text style={styles.detailsButtonText}>Details</Text>
                    <Navigation size={14} stroke="#fff" />
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#44AEBC" />
                <Text style={styles.loadingText}>Fetching assigned loads...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Available Loads</Text>
                    <Text style={styles.subtitle}>Loads assigned to you ready to start</Text>
                </View>
                <View style={styles.searchBarRow}>
                    <View style={styles.searchContainer}>
                        <Search size={18} stroke="#94a3b8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search loads..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.refreshBtn, refreshing && styles.refreshBtnActive]}
                        onPress={() => fetchLoads(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw size={20} stroke={refreshing ? "#44AEBC" : "#64748b"} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredRequests}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchLoads(true)} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Package size={48} stroke="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No new loads assigned</Text>
                        <Text style={styles.emptySubtitle}>When your carrier assigns you a load, it will appear here.</Text>

                        {/* Notification Cards */}
                        <View style={styles.notificationCardsContainer}>
                            {/* Active Trip Card */}
                            {activeTrip && (
                                <TouchableOpacity
                                    style={styles.notificationCard}
                                    onPress={() => router.push('/active')}
                                >
                                    <View style={[styles.notificationIcon, { backgroundColor: '#dbeafe' }]}>
                                        <Navigation size={20} stroke="#3b82f6" />
                                    </View>
                                    <View style={styles.notificationContent}>
                                        <Text style={styles.notificationTitle}>Active Trip in Progress</Text>
                                        <Text style={styles.notificationText} numberOfLines={2}>
                                            {activeTrip.pickup_city}, {activeTrip.pickup_state} → {activeTrip.delivery_city}, {activeTrip.delivery_state}
                                        </Text>
                                    </View>
                                    <View style={styles.notificationBadge}>
                                        <Text style={styles.notificationBadgeText}>VIEW</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Last Completed Trip */}
                            {lastCompletedTrip && (
                                <TouchableOpacity
                                    style={styles.notificationCard}
                                    onPress={() => router.push({ pathname: '/load-details/[id]', params: { id: lastCompletedTrip.id } })}
                                >
                                    <View style={[styles.notificationIcon, { backgroundColor: '#dcfce7' }]}>
                                        <Package size={20} stroke="#16a34a" />
                                    </View>
                                    <View style={styles.notificationContent}>
                                        <Text style={styles.notificationTitle}>Last Completed Trip</Text>
                                        <Text style={styles.notificationText}>
                                            {lastCompletedTrip.cargo_type} - Delivered
                                        </Text>
                                    </View>
                                    <View style={[styles.notificationBadge, { backgroundColor: '#dcfce7' }]}>
                                        <Text style={[styles.notificationBadgeText, { color: '#16a34a' }]}>✓</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Unread Messages */}
                            {unreadMessages > 0 && (
                                <TouchableOpacity
                                    style={styles.notificationCard}
                                    onPress={() => router.push('/messages')}
                                >
                                    <View style={[styles.notificationIcon, { backgroundColor: '#fef3c7' }]}>
                                        <Package size={20} stroke="#f59e0b" />
                                    </View>
                                    <View style={styles.notificationContent}>
                                        <Text style={styles.notificationTitle}>New Messages</Text>
                                        <Text style={styles.notificationText}>
                                            You have {unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                    <View style={[styles.notificationBadge, { backgroundColor: '#ef4444' }]}>
                                        <Text style={styles.notificationBadgeText}>{unreadMessages}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stickyHeader: {
        backgroundColor: '#fff',
        padding: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerInfo: {
        marginBottom: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    searchBarRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 45,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: '#1e293b',
    },
    refreshBtn: {
        width: 45,
        height: 45,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    refreshBtnActive: {
        borderColor: '#44AEBC',
    },
    listContent: {
        padding: 16,
    },
    loadingText: {
        marginTop: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardHeader: {
        marginBottom: 16,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    cargoName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1e293b',
        flexShrink: 1,
    },
    cargoId: {
        fontSize: 10,
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeStandard: {
        backgroundColor: '#f1f5f9',
    },
    badgeHeavy: {
        backgroundColor: '#eff6ff',
    },
    badgeOverweight: {
        backgroundColor: '#fff7ed',
    },
    badgeTextStandard: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748b',
        textTransform: 'uppercase',
    },
    badgeTextHeavy: {
        fontSize: 10,
        fontWeight: '800',
        color: '#44AEBC',
        textTransform: 'uppercase',
    },
    badgeTextOverweight: {
        fontSize: 10,
        fontWeight: '800',
        color: '#ea580c',
        textTransform: 'uppercase',
    },
    routeContainer: {
        marginBottom: 20,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 12,
    },
    routeLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    routeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    connector: {
        height: 15,
        borderLeftWidth: 2,
        borderLeftColor: '#f1f5f9',
        borderStyle: 'dashed',
        marginLeft: 3,
        marginVertical: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 15,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#64748b',
        marginLeft: 6,
        fontWeight: '700',
    },
    detailsButton: {
        backgroundColor: '#44AEBC',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailsButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
        marginRight: 6,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#475569',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginTop: 8,
        fontWeight: '500',
    },
    notificationCardsContainer: {
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 32,
        gap: 12,
    },
    notificationCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    notificationIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    notificationText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    notificationBadge: {
        backgroundColor: '#44AEBC',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 8,
    },
    notificationBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '900',
    }
});
