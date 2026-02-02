import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
}

export default function ChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id, name, role } = params;
    const { user } = useAuth();

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    const fetchMessages = async () => {
        try {
            const response = await api.get(`/messages/conversations/${id}`);
            if (response.data.success) {
                setMessages(response.data.data);
            }
        } catch (error) {
            console.error("Fetch messages error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(() => fetchMessages(), 5000);
        return () => clearInterval(interval);
    }, [id]);

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        const tempId = Date.now().toString();
        const tempMessage: Message = {
            id: tempId,
            sender_id: user?.id || '',
            content: newMessage,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMessage]);
        setNewMessage("");

        try {
            const response = await api.post("/messages", {
                conversationId: id,
                content: tempMessage.content
            });

            if (response.data.success) {
                // Replace temp message with real one or just re-fetch
                fetchMessages();
            }
        } catch (error) {
            console.error("Send message error:", error);
            // Optionally remove temp message or show error
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMe = item.sender_id === user?.id;
        return (
            <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} stroke="#0f172a" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName}>{name}</Text>
                    <Text style={styles.headerRole}>{role}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#44AEBC" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !newMessage.trim() && styles.disabledSend]}
                        onPress={sendMessage}
                        disabled={!newMessage.trim()}
                    >
                        <Send size={20} stroke="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backButton: { padding: 8, marginRight: 8 },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    headerRole: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 20 },
    messageRow: { marginBottom: 12, flexDirection: 'row' },
    myMessageRow: { justifyContent: 'flex-end' },
    otherMessageRow: { justifyContent: 'flex-start' },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
    myMessage: { backgroundColor: '#44AEBC', borderTopRightRadius: 4 },
    otherMessage: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderTopLeftRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 20 },
    myMessageText: { color: '#fff' },
    otherMessageText: { color: '#1e293b' },
    messageTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
    myMessageTime: { color: 'rgba(255,255,255,0.7)' },
    otherMessageTime: { color: '#94a3b8' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, fontSize: 16, maxHeight: 100, marginRight: 12 },
    sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#44AEBC', justifyContent: 'center', alignItems: 'center' },
    disabledSend: { backgroundColor: '#94a3b8' }
});
