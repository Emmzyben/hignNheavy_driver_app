import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar, CheckCircle, Navigation, Hourglass, Package, ChevronRight } from 'lucide-react-native';
import api from '../../lib/api';

interface Trip {
    id: string;
    cargoName: string;
    weight: string;
    status: string;
    origin: { city: string; state: string };
    destination: { city: string; state: string };
    date: string;
    completedAt?: string;
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case "delivered":
        case "completed":
            return (
                <View style={[styles.statusBadge, { backgroundColor: '#ecfdf5' }]}>
                    <CheckCircle size={12} stroke="#10b981" style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: '#10b981' }]}>COMPLETED</Text>
                </View>
            );
        case "in_transit":
            return (
                <View style={[styles.statusBadge, { backgroundColor: '#eff6ff' }]}>
                    <Navigation size={12} stroke="#3b82f6" style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: '#3b82f6' }]}>IN TRANSIT</Text>
                </View>
            );
        case "booked":
            return (
                <View style={[styles.statusBadge, { backgroundColor: '#fff7ed' }]}>
                    <Hourglass size={12} stroke="#f59e0b" style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: '#f59e0b' }]}>UPCOMING</Text>
                </View>
            );
        default:
            return (
                <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
                    <Text style={[styles.statusText, { color: '#64748b' }]}>{status.toUpperCase()}</Text>
                </View>
            );
    }
};

export default function MyTrips() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("all");
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get("/bookings/my-bookings");
            if (response.data.success) {
                const mapped = response.data.data.map((b: any) => ({
                    id: b.id,
                    cargoName: b.cargo_type,
                    weight: `${b.weight_lbs.toLocaleString()} lbs`,
                    status: b.status,
                    origin: { city: b.pickup_city, state: b.pickup_state },
                    destination: { city: b.delivery_city, state: b.delivery_state },
                    date: new Date(b.shipment_date).toLocaleDateString(),
                    completedAt: b.status === 'delivered' || b.status === 'completed' ? new Date(b.updated_at).toLocaleDateString() : undefined,
                }));
                setTrips(mapped);
            }
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const filteredTrips = trips.filter((trip) => {
        if (activeTab === "all") return true;
        if (activeTab === "completed") return trip.status === "delivered" || trip.status === "completed";
        if (activeTab === "pending") return trip.status === "booked" || trip.status === "in_transit";
        return trip.status === activeTab;
    });

    const renderItem = ({ item }: { item: Trip }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cargoName}>{item.cargoName}</Text>
                    <Text style={styles.cargoId}>ID: #{item.id.split('-')[0]} • {item.weight}</Text>
                </View>
                {getStatusBadge(item.status)}
            </View>

            <View style={styles.routeContainer}>
                <View style={styles.routeItem}>
                    <View style={[styles.dot, { backgroundColor: '#44AEBC' }]} />
                    <Text style={styles.routeText}>{item.origin.city}, {item.origin.state}</Text>
                </View>
                <View style={styles.connector} />
                <View style={styles.routeItem}>
                    <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.routeText}>{item.destination.city}, {item.destination.state}</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.footerInfo}>
                    <Calendar size={14} stroke="#44AEBC" style={{ marginRight: 6 }} />
                    <Text style={styles.footerText}>{item.date}</Text>
                </View>
                <TouchableOpacity
                    style={styles.detailsBtn}
                    onPress={() => router.push({
                        pathname: `/load-details/${item.id}`,
                        params: {
                            id: item.id,
                            cargoName: item.cargoName,
                            weight: item.weight,
                            originCity: item.origin.city,
                            originState: item.origin.state,
                            destCity: item.destination.city,
                            destState: item.destination.state,
                            hideButtons: 'true'
                        }
                    })}
                >
                    <Text style={styles.detailsLink}>Details</Text>
                    <ChevronRight size={14} stroke="#44AEBC" />
                </TouchableOpacity>
            </View>

            {item.completedAt && (
                <View style={styles.completedBanner}>
                    <Text style={styles.completedText}>Successfully Delivered on {item.completedAt}</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#44AEBC" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <Text style={styles.title}>My Trips</Text>
                <Text style={styles.subtitle}>History of your assigned and completed loads</Text>

                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                        onPress={() => setActiveTab('all')}
                    >
                        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Jobs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
                        onPress={() => setActiveTab('completed')}
                    >
                        <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>Completed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Active</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredTrips}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Package size={48} stroke="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No trips found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    stickyHeader: {
        backgroundColor: '#fff',
        padding: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: '500' },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        padding: 4,
        marginTop: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    activeTabText: {
        color: '#0f172a',
    },
    listContent: { padding: 16 },
    card: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    cargoName: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    cargoId: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    routeContainer: { marginBottom: 16 },
    routeItem: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
    routeText: { fontSize: 14, fontWeight: '700', color: '#334155' },
    connector: { height: 12, borderLeftWidth: 2, borderLeftColor: '#f1f5f9', borderStyle: 'dotted', marginLeft: 3, marginVertical: 2 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
    footerInfo: { flexDirection: 'row', alignItems: 'center' },
    footerText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
    detailsBtn: { flexDirection: 'row', alignItems: 'center' },
    detailsLink: { fontSize: 12, color: '#44AEBC', fontWeight: '900', marginRight: 4 },
    completedBanner: { marginTop: 15, backgroundColor: '#ecfdf5', padding: 10, borderRadius: 10 },
    completedText: { color: '#059669', fontSize: 10, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#64748b', marginTop: 12 }
});
