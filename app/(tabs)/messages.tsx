import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare, Search, User, ChevronRight } from 'lucide-react-native';
import api from '../../lib/api';

interface Conversation {
    id: string;
    other_user_name: string;
    other_user_role: string;
    other_user_company: string;
    other_user_avatar?: string;
    last_message_time: string;
    last_message: string;
}

export default function Messages() {
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchConversations = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const response = await api.get("/messages/conversations");
            if (response.data.success) {
                console.log("Conversations data:", response.data.data);
                setConversations(response.data.data);
            }
        } catch (error) {
            console.error("Fetch conversations error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    const filteredConversations = conversations.filter(c =>
        c.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }: { item: Conversation }) => {
        console.log("Rendering conversation:", item.id, "Last message:", item.last_message);
        return (
            <TouchableOpacity
                style={styles.convItem}
                onPress={() => router.push({
                    pathname: `/messages/${item.id}`,
                    params: {
                        id: item.id,
                        name: item.other_user_name,
                        role: item.other_user_role,
                        company: item.other_user_company,
                        avatar: item.other_user_avatar || ''
                    }
                })}
            >
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.other_user_name?.charAt(0) || '?'}</Text>
                    </View>
                    <View style={styles.onlineStatus} />
                </View>
                <View style={styles.convInfo}>
                    <View style={styles.convHeader}>
                        <Text style={styles.userName}>{item.other_user_name}</Text>
                        <Text style={styles.time}>{item.last_message_time ? new Date(item.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                    </View>
                    <View style={styles.msgRow}>
                        <Text style={styles.lastMsg} numberOfLines={1}>{item.last_message || "No messages yet"}</Text>
                        <ChevronRight size={14} stroke="#cbd5e1" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#44AEBC" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <Text style={styles.title}>Messages</Text>
                <Text style={styles.subtitle}>Direct communication with your carriers and shippers</Text>

                <View style={styles.searchContainer}>
                    <Search size={18} stroke="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#94a3b8"
                    />
                </View>
            </View>

            <FlatList
                data={filteredConversations}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchConversations(true)} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <MessageSquare size={40} stroke="#cbd5e1" />
                        </View>
                        <Text style={styles.emptyTitle}>No conversations found</Text>
                        <Text style={styles.emptySubtitle}>Messages about your active loads will appear here.</Text>
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
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '500', lineHeight: 18 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        marginTop: 20
    },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1e293b', fontWeight: '600' },
    listContent: { flexGrow: 1 },
    convItem: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
        alignItems: 'center'
    },
    avatarContainer: { position: 'relative' },
    avatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    avatarText: { color: '#44AEBC', fontWeight: '900', fontSize: 22 },
    onlineStatus: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', position: 'absolute', bottom: -2, right: 14, borderWidth: 3, borderColor: '#fff' },
    convInfo: { flex: 1 },
    convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    userName: { fontWeight: '900', fontSize: 17, color: '#1e293b' },
    time: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    msgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMsg: { fontSize: 14, color: '#64748b', fontWeight: '500', flex: 1, marginRight: 10 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: 40 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#475569' },
    emptySubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8, fontWeight: '500', lineHeight: 20 }
});
