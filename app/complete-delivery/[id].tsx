import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, Modal, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, X, Check, PenTool, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import SignatureScreen from 'react-native-signature-canvas';
import api from '../../lib/api';

export default function CompleteDelivery() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [photos, setPhotos] = useState<string[]>([]);
    const [signature, setSignature] = useState<string | null>(null);
    const [receiverName, setReceiverName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);

    const signatureRef = useRef<any>();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhotos([...photos, result.assets[0].uri]);
        }
    };

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.granted === false) {
            Alert.alert("Permission Required", "Camera access is needed to take delivery photos.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhotos([...photos, result.assets[0].uri]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(photos.filter((_, i) => i !== index));
    };

    const handleSignatureOK = (signature: string) => {
        setSignature(signature); // Base64 string
        setShowSignatureModal(false);
    };

    const handleClearSignature = () => {
        signatureRef.current.clearSignature();
    };

    const uploadPhoto = async (uri: string) => {
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'photo.jpg';
        // @ts-ignore
        formData.append('photo', {
            uri,
            name: filename,
            type: 'image/jpeg',
        });

        const response = await api.post('/drivers/upload-delivery-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.url;
    };

    const handleComplete = async () => {
        if (photos.length === 0) {
            Alert.alert("Error", "Please upload at least one delivery photo.");
            return;
        }
        if (!signature) {
            Alert.alert("Error", "Receiver's signature is required.");
            return;
        }
        if (!receiverName.trim()) {
            Alert.alert("Error", "Receiver's name is required.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Upload photos first
            const photoUrls = await Promise.all(photos.map(uploadPhoto));

            // 2. Submit completion
            const response = await api.post(`/drivers/complete-load/${id}`, {
                delivery_photos: photoUrls,
                delivery_signature: signature,
                receiver_name: receiverName
            });

            if (response.data.success) {
                Alert.alert("Delivery Completed", "Great job! The delivery has been marked as complete.", [
                    { text: "OK", onPress: () => router.replace('/(tabs)/trips') } // Go to history
                ]);
            }
        } catch (error: any) {
            console.error("Complete delivery error:", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to complete delivery. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} stroke="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Complete Delivery</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Photos Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Delivery Photos</Text>
                    <Text style={styles.subtitle}>Take photos of the delivered cargo</Text>

                    <View style={styles.photoGrid}>
                        {photos.map((uri, index) => (
                            <View key={index} style={styles.photoContainer}>
                                <Image source={{ uri }} style={styles.photo} />
                                <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(index)}>
                                    <X size={12} stroke="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
                            <Camera size={24} stroke="#94a3b8" />
                            <Text style={styles.addPhotoText}>Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                            <Upload size={24} stroke="#94a3b8" />
                            <Text style={styles.addPhotoText}>Upload</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Signature Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Receiver's Signature</Text>
                    <Text style={styles.subtitle}>Obtain signature from receiver</Text>

                    {signature ? (
                        <View style={styles.signaturePreview}>
                            <Image source={{ uri: signature }} style={styles.signatureImage} resizeMode="contain" />
                            <View style={styles.signatureFooter}>
                                <View style={styles.signatureSuccess}>
                                    <Check size={16} stroke="#16a34a" />
                                    <Text style={styles.successText}>Signature captured</Text>
                                </View>
                                <TouchableOpacity onPress={() => setSignature(null)}>
                                    <Text style={styles.retryText}>Retake</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.signaturePlaceholder} onPress={() => setShowSignatureModal(true)}>
                            <PenTool size={24} stroke="#44AEBC" />
                            <Text style={styles.signatureBtnText}>Capture Signature</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Receiver Name */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Receiver's Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter full name"
                        value={receiverName}
                        onChangeText={setReceiverName}
                        placeholderTextColor="#94a3b8"
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.completeButton, isSubmitting && styles.disabledButton]}
                    onPress={handleComplete}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.completeButtonText}>Complete Trip</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Modal visible={showSignatureModal} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Sign Here</Text>
                        <TouchableOpacity onPress={() => setShowSignatureModal(false)}>
                            <X size={24} stroke="#0f172a" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.signatureCanvasContainer}>
                        <SignatureScreen
                            ref={signatureRef}
                            onOK={handleSignatureOK}
                            webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
                            autoClear={true}
                        />
                    </View>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalBtnSecondary} onPress={handleClearSignature}>
                            <Text style={styles.modalBtnTextSecondary}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => signatureRef.current.readSignature()}>
                            <Text style={styles.modalBtnTextPrimary}>Save Signature</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    content: { padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    photoContainer: { width: '30%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', position: 'relative' },
    photo: { width: '100%', height: '100%' },
    removePhoto: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239, 68, 68, 0.9)', padding: 4, borderRadius: 10 },
    addPhotoBtn: { width: '30%', aspectRatio: 1, borderRadius: 8, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    addPhotoText: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 4 },
    signaturePlaceholder: { height: 80, borderRadius: 12, borderWidth: 2, borderColor: '#eff6ff', borderStyle: 'dashed', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
    signatureBtnText: { color: '#44AEBC', fontWeight: '700' },
    signaturePreview: { height: 120, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 8 },
    signatureImage: { flex: 1, width: '100%', height: '100%' },
    signatureFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
    signatureSuccess: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    successText: { fontSize: 12, color: '#16a34a', fontWeight: '700' },
    retryText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    sectionLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, color: '#1e293b' },
    footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    completeButton: { backgroundColor: '#16a34a', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    disabledButton: { opacity: 0.7 },
    completeButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '900' },
    signatureCanvasContainer: { flex: 1 },
    modalFooter: { padding: 20, flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    modalBtnSecondary: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    modalBtnTextSecondary: { fontWeight: '700', color: '#64748b' },
    modalBtnPrimary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#44AEBC', alignItems: 'center' },
    modalBtnTextPrimary: { fontWeight: '700', color: '#fff' },
});
