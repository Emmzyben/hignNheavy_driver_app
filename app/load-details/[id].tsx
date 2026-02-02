import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Navigation, Clock, Weight, Ruler, CheckCircle } from 'lucide-react-native';
import api from '../../lib/api';

export default function LoadDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [accepting, setAccepting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tripDetails, setTripDetails] = useState<any>(null);

    // Parse params or use defaults if navigating directly (shouldn't happen usually)
    const {
        id,
        cargoName,
        weight,
        originCity,
        originState,
        destCity,
        destState,
        distance = "Calculating...",
        duration = "TBD",
        dimensions,
        hideButtons
    } = params;

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch latest details to get completion data (photos, signature, etc.)
                const response = await api.get("/bookings/my-bookings");
                if (response.data.success) {
                    const found = response.data.data.find((b: any) => b.id === id);
                    if (found) {
                        setTripDetails({
                            ...found,
                            cargoName: found.cargo_type,
                            weight: `${found.weight_lbs.toLocaleString()} lbs`,
                            dimensions: `${found.dimensions_length_ft}ft x ${found.dimensions_width_ft}ft x ${found.dimensions_height_ft}ft`,
                            origin: { city: found.pickup_city, state: found.pickup_state, address: found.pickup_address },
                            destination: { city: found.delivery_city, state: found.delivery_state, address: found.delivery_address },
                            distance: "Calculating...",
                            duration: new Date(found.shipment_date).toLocaleDateString(),
                            deliveryPhotos: found.delivery_photos ? (typeof found.delivery_photos === 'string' ? JSON.parse(found.delivery_photos) : found.delivery_photos) : [],
                            deliverySignature: found.delivery_signature,
                            receiverName: found.receiver_name,
                            updatedAt: found.updated_at
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch details", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchDetails();
    }, [id]);

    const handleAccept = async () => {
        setAccepting(true);
        try {
            const response = await api.post(`/drivers/accept-load/${id}`);
            if (response.data.success) {
                Alert.alert("Success", "Load accepted successfully!");
                router.replace('/(tabs)/active');
            }
        } catch (error: any) {
            console.error("Accept load error:", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to accept load");
        } finally {
            setAccepting(false);
        }
    };

    const handleDecline = () => {
        Alert.alert("Decline Load", "Are you sure you want to decline this request?", [
            { text: "Cancel", style: "cancel" },
            { text: "Decline", style: "destructive", onPress: () => router.back() }
        ]);
    };

    // Use fetched details if available, otherwise fallback to params
    const displayData = tripDetails || {
        cargoName: params.cargoName,
        weight: params.weight,
        id: params.id,
        status: 'unknown',
        origin: {
            city: params.originCity,
            state: params.originState,
            address: 'Loading...'
        },
        destination: {
            city: params.destCity,
            state: params.destState,
            address: 'Loading...'
        },
        distance: params.distance || "Calculating...",
        duration: params.duration || "TBD",
        dimensions: params.dimensions
    };

    const isCompleted = displayData.status === 'delivered' || displayData.status === 'completed';
    const isInTransit = displayData.status === 'in_transit';
    const isBooked = displayData.status === 'booked';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} stroke="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Load Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cargoName}>{displayData.cargoName}</Text>
                            <Text style={styles.cargoId}>ID: #{String(displayData.id).split('-')[0]} • {displayData.weight}</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{isCompleted ? 'COMPLETED' : 'WIDE LOAD'}</Text>
                        </View>
                    </View>

                    <View style={styles.routeContainer}>
                        <View style={styles.routeItem}>
                            <View style={[styles.dot, { backgroundColor: '#44AEBC' }]} />
                            <View>
                                <Text style={styles.routeCity}>{displayData.origin?.city}, {displayData.origin?.state}</Text>
                                <Text style={styles.routeLabel}>PICKUP LOCATION</Text>
                            </View>
                        </View>
                        <View style={styles.connector} />
                        <View style={styles.routeItem}>
                            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                            <View>
                                <Text style={styles.routeCity}>{displayData.destination?.city}, {displayData.destination?.state}</Text>
                                <Text style={styles.routeLabel}>DELIVERY LOCATION</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Trip Details</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <View style={styles.iconBox}>
                                <Navigation size={20} stroke="#64748b" />
                            </View>
                            <Text style={styles.statLabel}>DISTANCE</Text>
                            <Text style={styles.statValue}>{displayData.distance}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <View style={styles.iconBox}>
                                <Clock size={20} stroke="#64748b" />
                            </View>
                            <Text style={styles.statLabel}>DURATION</Text>
                            <Text style={styles.statValue}>{displayData.duration}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <View style={styles.iconBox}>
                                <Weight size={20} stroke="#64748b" />
                            </View>
                            <Text style={styles.statLabel}>WEIGHT</Text>
                            <Text style={styles.statValue}>{displayData.weight}</Text>
                        </View>
                    </View>
                </View>

                {displayData.dimensions && (
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Ruler size={20} stroke="#64748b" style={{ marginRight: 10 }} />
                            <View>
                                <Text style={styles.sectionTitle}>Dimensions</Text>
                                <Text style={styles.dimText}>{displayData.dimensions}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {isCompleted && tripDetails && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Delivery Proof</Text>

                        {tripDetails.deliveryPhotos && tripDetails.deliveryPhotos.length > 0 && (
                            <View style={styles.photosGrid}>
                                {tripDetails.deliveryPhotos.map((photo: string, index: number) => (
                                    <Image
                                        key={index}
                                        source={{ uri: photo }}
                                        style={styles.deliveryPhoto}
                                        resizeMode="cover"
                                    />
                                ))}
                            </View>
                        )}

                        <View style={styles.deliveryInfoRow}>
                            <View style={styles.deliveryInfoItem}>
                                <Text style={styles.deliveryLabel}>RECEIVER NAME</Text>
                                <Text style={styles.deliveryValue}>{tripDetails.receiverName || 'N/A'}</Text>

                                <Text style={[styles.deliveryLabel, { marginTop: 12 }]}>DELIVERED ON</Text>
                                <Text style={styles.deliveryValue}>
                                    {tripDetails.updatedAt ? new Date(tripDetails.updatedAt).toLocaleString() : 'N/A'}
                                </Text>
                            </View>

                            <View style={styles.deliveryInfoItem}>
                                <Text style={styles.deliveryLabel}>SIGNATURE</Text>
                                {tripDetails.deliverySignature ? (
                                    <View style={styles.signatureBox}>
                                        <Image
                                            source={{ uri: tripDetails.deliverySignature }}
                                            style={styles.signatureImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                ) : (
                                    <Text style={styles.deliveryValue}>Not signed</Text>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {isBooked ? (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={handleAccept}
                        disabled={accepting}
                    >
                        {accepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptButtonText}>Start Trip</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineButton} onPress={handleDecline} disabled={accepting}>
                        <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                    <Text style={styles.disclaimerText}>
                        By starting this trip, you confirm you have inspected the load and the vehicle is ready for transport.
                    </Text>
                </View>
            ) : isInTransit ? (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.acceptButton, { backgroundColor: '#10b981', shadowColor: '#10b981' }]} // Green for finish
                        onPress={() => router.push({ pathname: '/complete-delivery/[id]', params: { id: displayData.id } })}
                    >
                        <Text style={styles.acceptButtonText}>End Trip & Deliver</Text>
                    </TouchableOpacity>
                </View>
            ) : isCompleted ? (
                <View style={styles.footer}>
                    <View style={styles.completedBanner}>
                        <Text style={styles.completedBannerText}>Job Completed</Text>
                        <Text style={styles.completedBannerSubText}>Proof of delivery captured successfully</Text>
                    </View>
                </View>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    content: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    cargoName: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    cargoId: { fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 4 },
    badge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 10, color: '#44AEBC', fontWeight: '900' },
    routeContainer: { marginLeft: 4 },
    routeItem: { flexDirection: 'row', alignItems: 'flex-start' },
    dot: { width: 12, height: 12, borderRadius: 6, marginTop: 5, marginRight: 16, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    connector: { height: 30, borderLeftWidth: 2, borderLeftColor: '#f1f5f9', borderStyle: 'dashed', marginLeft: 5, marginVertical: 4 },
    routeCity: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    routeLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
    sectionTitle: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginBottom: 16 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    statBox: { flex: 1, alignItems: 'center', padding: 10, backgroundColor: '#f8fafc', borderRadius: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    statLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', marginBottom: 4 },
    statValue: { fontSize: 13, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
    row: { flexDirection: 'row', alignItems: 'center' },
    dimText: { fontSize: 14, color: '#475569', fontWeight: '600' },
    footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    acceptButton: { backgroundColor: '#44AEBC', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, shadowColor: '#44AEBC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    acceptButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    declineButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    declineButtonText: { color: '#64748b', fontSize: 16, fontWeight: '700' },
    photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    deliveryPhoto: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f1f5f9' },
    deliveryInfoRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
    deliveryInfoItem: { flex: 1 },
    deliveryLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '900', marginBottom: 4 },
    deliveryValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    signatureBox: { width: '100%', height: 60, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#fafaf9', borderStyle: 'dashed' },
    signatureImage: { width: '100%', height: '100%' },
    disclaimerText: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 12, paddingHorizontal: 10 },
    completedBanner: { backgroundColor: '#ecfdf5', padding: 16, borderRadius: 12, alignItems: 'center', width: '100%' },
    completedBannerText: { color: '#059669', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    completedBannerSubText: { color: '#10b981', fontSize: 10, fontWeight: '600' }
});
