import React from 'react';
import { Tabs } from 'expo-router';
import { Package, ClipboardList, Navigation, MessageCircle, User } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: '#44AEBC',
            headerShown: false,
            tabBarStyle: { borderTopWidth: 1, borderTopColor: '#f1f5f9', height: 60, paddingBottom: 8 },
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Available',
                    tabBarIcon: ({ color }) => <Package size={24} stroke={color} />,
                }}
            />
            <Tabs.Screen
                name="trips"
                options={{
                    title: 'My Trips',
                    tabBarIcon: ({ color }) => <ClipboardList size={24} stroke={color} />,
                }}
            />
            <Tabs.Screen
                name="active"
                options={{
                    title: 'Active',
                    tabBarIcon: ({ color }) => <Navigation size={24} stroke={color} />,
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                    tabBarIcon: ({ color }) => <MessageCircle size={24} stroke={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} stroke={color} />,
                }}
            />
        </Tabs>
    );
}
