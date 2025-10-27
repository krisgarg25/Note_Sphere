import { Tabs } from "expo-router";
import React, { memo } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const TabIcon = memo(({ focused, iconName, label }: { focused: boolean; iconName: string; label: string }) => {
    return (
        <View
            style={[
                styles.tabIconContainer,
                { transform: [{ translateY: focused ? -8 : 0 }] }
            ]}
        >
            {focused ? (
                <LinearGradient
                    colors={['#3b82f6', '#6366f1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.focusedIcon}
                >
                    <Ionicons
                        name={iconName}
                        size={24}
                        color="white"
                    />
                </LinearGradient>
            ) : (
                <View style={styles.unfocusedIcon}>
                    <Ionicons
                        name={iconName}
                        size={24}
                        color="#9ca3af"
                    />
                </View>
            )}
            <Text
                style={[
                    styles.labelText,
                    focused ? styles.labelFocused : styles.labelUnfocused
                ]}
                numberOfLines={1}
            >
                {label}
            </Text>
        </View>
    );
});

const _layout = () => {
    return (
        <Tabs
            screenOptions={{
                animation: "none",
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    height: 75,
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    paddingTop: 16,
                    borderRadius: 28,
                    marginBottom: 20,
                    marginHorizontal: 12,
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.12,
                    shadowRadius: 24,
                    elevation: 16,
                    borderWidth: 0,
                    position: 'absolute',
                },
                tabBarItemStyle: {
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
            }}
        >
            <Tabs.Screen
                name="Record"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            iconName={focused ? 'mic-circle' : 'mic-circle-outline'}
                            label="RECORD"
                        />
                    ),
                    tabBarButton: (props) => (
                        <Pressable
                            {...props}
                            style={styles.pressableButton}
                            android_ripple={{
                                color: 'rgba(59, 130, 246, 0.12)',
                                borderless: false,
                                radius: 40
                            }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="Recordings"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            iconName={focused ? 'musical-notes' : 'musical-notes-outline'}
                            label="LIBRARY"
                        />
                    ),
                    tabBarButton: (props) => (
                        <Pressable
                            {...props}
                            style={styles.pressableButton}
                            android_ripple={{
                                color: 'rgba(59, 130, 246, 0.12)',
                                borderless: false,
                                radius: 40
                            }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="Profile"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            focused={focused}
                            iconName={focused ? 'person-circle' : 'person-circle-outline'}
                            label="PROFILE"
                        />
                    ),
                    tabBarButton: (props) => (
                        <Pressable
                            {...props}
                            style={styles.pressableButton}
                            android_ripple={{
                                color: 'rgba(59, 130, 246, 0.12)',
                                borderless: false,
                                radius: 40
                            }}
                        />
                    ),
                }}
            />
        </Tabs>
    );
};

const styles = StyleSheet.create({
    tabIconContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: 72,
        height: 56,
    },
    focusedIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    unfocusedIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
    },
    labelText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    labelFocused: {
        color: '#2563eb',
    },
    labelUnfocused: {
        color: '#9ca3af',
    },
    pressableButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default _layout;
