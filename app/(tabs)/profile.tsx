import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput, Modal, Switch } from 'react-native';
import { User, Mail, Phone, Shield, Lock, Bell, LogOut, ChevronRight, CheckCircle, Clock, Eye, EyeOff, Camera, X } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';

export default function Profile() {
    const { user, logout, refreshUser } = useAuth();
    const [fetching, setFetching] = useState(true);
    const [driverData, setDriverData] = useState<any>(null);
    const [stats, setStats] = useState({
        completed: 0,
        pending: 0
    });

    // Password change states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Notification states
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [updatingNotifications, setUpdatingNotifications] = useState(false);

    // Avatar upload state
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        const fetchDriverStats = async () => {
            try {
                const [driverResponse, userResponse] = await Promise.all([
                    api.get("/drivers/me"),
                    api.get("/users/me")
                ]);

                if (driverResponse.data.success) {
                    const d = driverResponse.data.data;
                    setDriverData(d);
                    setStats({
                        completed: d.completed_jobs || 0,
                        pending: 0
                    });
                }

                if (userResponse.data.success) {
                    setEmailNotifications(userResponse.data.data.email_notifications !== false);
                    setPushNotifications(userResponse.data.data.push_notifications !== false);
                }
            } catch (error) {
                console.error("Failed to fetch driver stats", error);
            } finally {
                setFetching(false);
            }
        };

        fetchDriverStats();
    }, [user]);

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: logout }
        ]);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photos to upload a profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            uploadAvatar(result.assets[0].uri);
        }
    };

    const uploadAvatar = async (uri: string) => {
        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            const filename = uri.split('/').pop() || 'avatar.jpg';
            // @ts-ignore
            formData.append('avatar', {
                uri,
                name: filename,
                type: 'image/jpeg',
            });

            const response = await api.post('/users/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                Alert.alert('Success', 'Profile picture updated successfully!');
                await refreshUser();
            }
        } catch (error: any) {
            console.error('Avatar upload error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handlePasswordUpdate = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters long');
            return;
        }

        setUpdatingPassword(true);
        try {
            await api.patch('/users/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            Alert.alert('Success', 'Password updated successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordModal(false);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleNotificationUpdate = async () => {
        setUpdatingNotifications(true);
        try {
            await api.patch('/users/notifications', {
                emailNotifications,
                pushNotifications
            });

            Alert.alert('Success', 'Notification preferences updated!');
            setShowNotificationModal(false);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update notifications');
        } finally {
            setUpdatingNotifications(false);
        }
    };

    if (fetching) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#44AEBC" />
            </View>
        );
    }

    return (
        <>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {user?.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <User size={40} stroke="#94a3b8" />
                            </View>
                        )}
                        <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage} disabled={uploadingAvatar}>
                            {uploadingAvatar ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Camera size={16} stroke="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user?.full_name}</Text>
                    <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
                    <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>Active & Verified</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconBox, { backgroundColor: '#ecfdf5' }]}>
                            <CheckCircle size={20} stroke="#10b981" />
                        </View>
                        <Text style={styles.statValue}>{stats.completed}</Text>
                        <Text style={styles.statLabel}>COMPLETED</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconBox, { backgroundColor: '#fff7ed' }]}>
                            <Clock size={20} stroke="#f59e0b" />
                        </View>
                        <Text style={styles.statValue}>{stats.pending}</Text>
                        <Text style={styles.statLabel}>PENDING</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>IDENTITY & CONTACT</Text>
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Mail size={18} stroke="#64748b" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Email Address</Text>
                            <Text style={styles.infoText}>{user?.email}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Phone size={18} stroke="#64748b" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Phone Number</Text>
                            <Text style={styles.infoText}>{driverData?.phone || user?.phone_number || "Not provided"}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconBox}>
                            <Shield size={18} stroke="#64748b" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Driving License</Text>
                            <Text style={styles.infoText}>{driverData?.license_number || "CDL-•••••••"}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>ACCOUNT SECURITY</Text>
                <View style={styles.infoCard}>
                    <TouchableOpacity style={styles.menuRow} onPress={() => setShowPasswordModal(true)}>
                        <View style={styles.infoIconBox}>
                            <Lock size={18} stroke="#64748b" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.menuTitle}>Change Password</Text>
                            <Text style={styles.menuSubtitle}>Update your account password</Text>
                        </View>
                        <ChevronRight size={18} stroke="#cbd5e1" />
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.menuRow} onPress={() => setShowNotificationModal(true)}>
                        <View style={styles.infoIconBox}>
                            <Bell size={18} stroke="#64748b" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.menuTitle}>Notifications</Text>
                            <Text style={styles.menuSubtitle}>Manage push & email updates</Text>
                        </View>
                        <ChevronRight size={18} stroke="#cbd5e1" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={18} stroke="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.logoutBtnText}>SIGN OUT ACCOUNT</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Password Change Modal */}
            <Modal visible={showPasswordModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                                <X size={24} stroke="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Current Password</Text>
                                <View style={styles.passwordInputContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        secureTextEntry={!showCurrentPassword}
                                        value={passwordData.currentPassword}
                                        onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                                        placeholder="Enter current password"
                                        placeholderTextColor="#94a3b8"
                                    />
                                    <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon}>
                                        {showCurrentPassword ? <EyeOff size={18} stroke="#64748b" /> : <Eye size={18} stroke="#64748b" />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>New Password</Text>
                                <View style={styles.passwordInputContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        secureTextEntry={!showNewPassword}
                                        value={passwordData.newPassword}
                                        onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                                        placeholder="Enter new password"
                                        placeholderTextColor="#94a3b8"
                                    />
                                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                                        {showNewPassword ? <EyeOff size={18} stroke="#64748b" /> : <Eye size={18} stroke="#64748b" />}
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.inputHint}>Must be at least 8 characters</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Confirm New Password</Text>
                                <View style={styles.passwordInputContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        secureTextEntry={!showConfirmPassword}
                                        value={passwordData.confirmPassword}
                                        onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                                        placeholder="Confirm new password"
                                        placeholderTextColor="#94a3b8"
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                        {showConfirmPassword ? <EyeOff size={18} stroke="#64748b" /> : <Eye size={18} stroke="#64748b" />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.modalButton, updatingPassword && styles.disabledButton]}
                                onPress={handlePasswordUpdate}
                                disabled={updatingPassword}
                            >
                                {updatingPassword ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonText}>Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Notifications Modal */}
            <Modal visible={showNotificationModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Notification Settings</Text>
                            <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                                <X size={24} stroke="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.notificationOption}>
                                <View style={styles.notificationInfo}>
                                    <Text style={styles.notificationTitle}>Email Notifications</Text>
                                    <Text style={styles.notificationSubtitle}>Receive updates about bookings and messages</Text>
                                </View>
                                <Switch
                                    value={emailNotifications}
                                    onValueChange={setEmailNotifications}
                                    trackColor={{ false: '#e2e8f0', true: '#44AEBC' }}
                                    thumbColor="#fff"
                                />
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.notificationOption}>
                                <View style={styles.notificationInfo}>
                                    <Text style={styles.notificationTitle}>Push Notifications</Text>
                                    <Text style={styles.notificationSubtitle}>Get real-time alerts on your device</Text>
                                </View>
                                <Switch
                                    value={pushNotifications}
                                    onValueChange={setPushNotifications}
                                    trackColor={{ false: '#e2e8f0', true: '#44AEBC' }}
                                    thumbColor="#fff"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.modalButton, updatingNotifications && styles.disabledButton]}
                                onPress={handleNotificationUpdate}
                                disabled={updatingNotifications}
                            >
                                {updatingNotifications ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonText}>Save Preferences</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#cbd5e1' },
    editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#44AEBC', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
    userName: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    userRole: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginTop: 4 },
    verifiedBadge: { marginTop: 12, backgroundColor: '#ecfdf5', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    verifiedText: { color: '#10b981', fontSize: 12, fontWeight: '800' },
    statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    statIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValue: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    statLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
    sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
    infoCard: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 24 },
    infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 2 },
    infoText: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    menuTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    menuSubtitle: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#f1f5f9' },
    logoutBtn: { backgroundColor: '#ef4444', borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    logoutBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    modalBody: { padding: 20 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
    passwordInputContainer: { position: 'relative' },
    passwordInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, paddingRight: 50, fontSize: 15, color: '#1e293b' },
    eyeIcon: { position: 'absolute', right: 14, top: 14 },
    inputHint: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
    modalButton: { backgroundColor: '#44AEBC', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
    disabledButton: { opacity: 0.7 },
    modalButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    notificationOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
    notificationInfo: { flex: 1, marginRight: 16 },
    notificationTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
    notificationSubtitle: { fontSize: 12, color: '#94a3b8' }
});
