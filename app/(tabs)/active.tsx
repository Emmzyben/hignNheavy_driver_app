import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Navigation, MapPin, Clock, Phone, MessageCircle, Square, Camera, RefreshCw } from 'lucide-react-native';
import api from '../../lib/api';
import { router } from 'expo-router';
import { getRouteInfo } from '../../lib/locationUtils';

const { width } = Dimensions.get('window');

export default function ActiveTrip() {
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<any>(null);
    const [locationPermission, setLocationPermission] = useState<boolean>(false);
    const mapRef = useRef<any>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const tripRef = useRef<any>(null);
    const [routeStats, setRouteStats] = useState<{
        distance: string;
        eta: string;
        arrivalTime: string;
    }>({
        distance: 'Calculating...',
        eta: 'TBD',
        arrivalTime: 'TBD'
    });

    // Update tripRef whenever trip changes
    useEffect(() => {
        console.log('🔄 Trip updated:', trip?.id);
        tripRef.current = trip;
    }, [trip]);

    // Request location permissions
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required for live tracking.');
                setLocationPermission(false);
                return;
            }
            setLocationPermission(true);

            // Get initial location
            const location = await Location.getCurrentPositionAsync({});
            setCurrentLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            // Start watching location
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 10000, // Update every 10 seconds
                    distanceInterval: 50, // Or when moved 50 meters
                },
                (location) => {
                    console.log('📡 Location changed:', location.coords.latitude, location.coords.longitude);
                    const newLocation = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    };
                    setCurrentLocation(newLocation);

                    // Update backend with current location if there's an active trip
                    const currentTrip = tripRef.current;
                    if (currentTrip) {
                        console.log('🚛 Active trip found, updating backend... Trip ID:', currentTrip.id);
                        updateDriverLocation(newLocation);
                    } else {
                        console.log('⚠️ No active trip, skipping backend update');
                    }
                }
            );
        })();

        return () => {
            // Cleanup location tracking on unmount
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []); // Only run once on mount

    // Update distance and ETA whenever location or trip changes
    useEffect(() => {
        if (currentLocation && trip && trip.destination) {
            const stats = getRouteInfo(
                currentLocation.latitude,
                currentLocation.longitude,
                trip.destination.latitude,
                trip.destination.longitude
            );

            setRouteStats({
                distance: stats.distanceFormatted,
                eta: stats.eta,
                arrivalTime: stats.arrivalTimeFormatted
            });
        }
    }, [currentLocation, trip]);

    const updateDriverLocation = async (location: { latitude: number; longitude: number }) => {
        try {
            console.log('📍 Updating driver location:', location, 'Trip ID:', trip?.id);
            const response = await api.patch(`/drivers/location`, {
                latitude: location.latitude,
                longitude: location.longitude,
                bookingId: trip?.id
            });
            console.log('✅ Location update response:', response.data);
        } catch (error: any) {
            console.error('❌ Failed to update driver location:', error);
            console.error('Error response:', error.response?.data);
        }
    };

    const fetchActiveTrip = async () => {
        setLoading(true);
        try {
            const response = await api.get("/drivers/active-trip");
            if (response.data.success && response.data.data) {
                const b = response.data.data;
                setTrip({
                    id: b.id,
                    cargoName: b.cargo_type,
                    weight: `${b.weight_lbs.toLocaleString()} lbs`,
                    shipper: {
                        name: b.shipper_company || b.shipper_name,
                        phone: b.shipper_phone || "+1 (555) 000-0000",
                    },
                    origin: {
                        city: b.pickup_city,
                        state: b.pickup_state,
                        address: b.pickup_address,
                        latitude: b.pickup_latitude || 37.7749,
                        longitude: b.pickup_longitude || -122.4194,
                    },
                    destination: {
                        city: b.delivery_city,
                        state: b.delivery_state,
                        address: b.delivery_address,
                        latitude: b.delivery_latitude || 34.0522,
                        longitude: b.delivery_longitude || -118.2437,
                    },
                    status: b.status,
                    distance: "Calculating...",
                    eta: "TBD"
                });
            } else {
                setTrip(null);
            }
        } catch (error) {
            console.error("Failed to fetch active trip", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveTrip();
    }, []);

    // Fit map to show all markers
    useEffect(() => {
        if (mapRef.current && currentLocation && trip) {
            const coordinates = [
                currentLocation,
                { latitude: trip.origin.latitude, longitude: trip.origin.longitude },
                { latitude: trip.destination.latitude, longitude: trip.destination.longitude },
            ];

            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }
    }, [currentLocation, trip]);

    const handleCompleteDelivery = () => {
        if (!trip) return;
        router.push(`/complete-delivery/${trip.id}`);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#44AEBC" />
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                    <Navigation size={40} stroke="#cbd5e1" />
                </View>
                <Text style={styles.emptyTitle}>No Active Trip</Text>
                <Text style={styles.emptySubtitle}>Accept a load to start tracking your route</Text>
                <TouchableOpacity style={styles.viewLoadsBtn} onPress={() => router.push('/')}>
                    <Text style={styles.viewLoadsBtnText}>View Available Loads</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map Section */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    showsUserLocation={false}
                    showsMyLocationButton={false}
                    initialRegion={{
                        latitude: currentLocation?.latitude || trip.origin.latitude,
                        longitude: currentLocation?.longitude || trip.origin.longitude,
                        latitudeDelta: 0.5,
                        longitudeDelta: 0.5,
                    }}
                >
                    {/* Current Driver Location Marker */}
                    {currentLocation && (
                        <Marker
                            coordinate={currentLocation}
                            title="Your Location"
                            pinColor="#ef4444"
                        />
                    )}

                    {/* Pickup Marker */}
                    <Marker
                        coordinate={{
                            latitude: trip.origin.latitude,
                            longitude: trip.origin.longitude,
                        }}
                        title="Pickup Location"
                        description={`${trip.origin.city}, ${trip.origin.state}`}
                        pinColor="#f97316"
                    />

                    {/* Delivery Marker */}
                    <Marker
                        coordinate={{
                            latitude: trip.destination.latitude,
                            longitude: trip.destination.longitude,
                        }}
                        title="Delivery Location"
                        description={`${trip.destination.city}, ${trip.destination.state}`}
                        pinColor="#6366f1"
                    />

                    {/* Route Line */}
                    {currentLocation && (
                        <Polyline
                            coordinates={[
                                currentLocation,
                                { latitude: trip.destination.latitude, longitude: trip.destination.longitude },
                            ]}
                            strokeColor="#44AEBC"
                            strokeWidth={3}
                            lineDashPattern={[10, 5]}
                        />
                    )}
                </MapView>

                {/* Map Overlay Info */}
                <View style={styles.mapOverlay}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{trip.status.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                </View>
            </View>

            {/* Scrollable Content Below Map */}
            <ScrollView style={styles.contentContainer} contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Route Information</Text>
                    <View style={styles.routeContainer}>
                        <View style={styles.routeItem}>
                            <View style={[styles.dot, { backgroundColor: '#f97316' }]} />
                            <View style={styles.routeInfo}>
                                <Text style={styles.routeLabel}>PICKUP</Text>
                                <Text style={styles.routeCity}>{trip.origin.city}, {trip.origin.state}</Text>
                                <Text style={styles.routeAddress}>{trip.origin.address}</Text>
                            </View>
                        </View>
                        <View style={styles.connector} />
                        <View style={styles.routeItem}>
                            <View style={[styles.dot, { backgroundColor: '#6366f1' }]} />
                            <View style={styles.routeInfo}>
                                <Text style={styles.routeLabel}>DELIVERY</Text>
                                <Text style={styles.routeCity}>{trip.destination.city}, {trip.destination.state}</Text>
                                <Text style={styles.routeAddress}>{trip.destination.address}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Trip Stats</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <View style={styles.statIconBox}>
                                <MapPin size={16} stroke="#64748b" />
                            </View>
                            <Text style={styles.statLabel}>DISTANCE</Text>
                            <Text style={styles.statValue}>{routeStats.distance}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <View style={styles.statIconBox}>
                                <Clock size={16} stroke="#64748b" />
                            </View>
                            <Text style={styles.statLabel}>ETA</Text>
                            <Text style={styles.statValue}>{routeStats.eta}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <View style={styles.statIconBox}>
                                <Clock size={16} stroke="#64748b" />
                            </View>
                            <Text style={styles.statLabel}>ARRIVAL</Text>
                            <Text style={styles.statValue}>{routeStats.arrivalTime}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cargoCard}>
                    <View style={styles.cargoInfo}>
                        <Text style={styles.cargoName}>{trip.cargoName}</Text>
                        <Text style={styles.cargoWeight}>{trip.weight}</Text>
                    </View>
                    <Square size={40} stroke="#fff" strokeWidth={2} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Contact Shipper</Text>
                    <View style={styles.contactRow}>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>{trip.shipper.name}</Text>
                            <Text style={styles.contactSubtitle}>YOUR EMPLOYER</Text>
                        </View>
                        <TouchableOpacity style={styles.contactButton}>
                            <MessageCircle size={18} stroke="#44AEBC" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.contactRow}>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactSubtitle}>{trip.shipper.phone}</Text>
                        </View>
                        <TouchableOpacity style={styles.contactButton}>
                            <Phone size={18} stroke="#44AEBC" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.completeButton} onPress={handleCompleteDelivery}>
                    <Camera size={20} stroke="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.completeButtonText}>COMPLETE DELIVERY</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, fontWeight: '500' },
    viewLoadsBtn: { backgroundColor: '#44AEBC', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 24 },
    viewLoadsBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
    mapContainer: { height: 300, position: 'relative' },
    map: { flex: 1 },
    mapOverlay: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    statusBadge: { backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    statusText: { color: '#44AEBC', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    contentContainer: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    cardTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 16 },
    routeContainer: { marginLeft: 4 },
    routeItem: { flexDirection: 'row', alignItems: 'flex-start' },
    dot: { width: 12, height: 12, borderRadius: 6, marginTop: 5, marginRight: 16, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    routeInfo: { flex: 1 },
    routeLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 4 },
    routeCity: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
    routeAddress: { fontSize: 14, color: '#64748b', fontWeight: '600' },
    connector: { height: 20, borderLeftWidth: 2, borderLeftColor: '#f1f5f9', borderStyle: 'dashed', marginLeft: 3, marginVertical: 4 },
    statsGrid: { flexDirection: 'row', gap: 8 },
    statBox: { flex: 1, alignItems: 'center', padding: 10, backgroundColor: '#f8fafc', borderRadius: 12 },
    statIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    statLabel: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 2 },
    statValue: { fontSize: 11, fontWeight: '900', color: '#1e293b', textAlign: 'center' },
    cargoCard: { backgroundColor: '#44AEBC', borderRadius: 16, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, shadowColor: '#44AEBC', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    cargoInfo: { flex: 1 },
    cargoName: { color: '#fff', fontSize: 20, fontWeight: '900' },
    cargoWeight: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4, fontWeight: '700' },
    contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 2 },
    contactSubtitle: { fontSize: 11, color: '#94a3b8', fontWeight: '800', letterSpacing: 0.5 },
    contactButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
    completeButton: { backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    completeButtonText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    mapPlaceholder: { flex: 1, backgroundColor: '#e0f2f1', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
    gradientOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(68, 174, 188, 0.05)' },
    mapPlaceholderContent: { alignItems: 'center', padding: 30, zIndex: 1 },
    mapPlaceholderTitle: { fontSize: 18, fontWeight: '900', color: '#44AEBC', marginTop: 16, letterSpacing: 2 },
    mapPlaceholderSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8, fontWeight: '600', paddingHorizontal: 20 },
    locationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 16, gap: 6 },
    locationBadgeText: { fontSize: 11, fontWeight: '800', color: '#10b981' },
    devBuildNote: { fontSize: 10, color: '#94a3b8', marginTop: 20, fontWeight: '600', fontStyle: 'italic' },
});
