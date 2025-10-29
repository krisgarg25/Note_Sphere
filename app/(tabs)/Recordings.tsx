import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { FIRESTORE_DB } from '@/utils/FirebaseConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { processRecording } from '@/utils/processing';

interface Recording {
    id: string;
    name: string;
    preview: string;
    transcription: string;
    notes: string;
    audioUri: string;
    createdAt: any;
    isProcessing?: boolean;
}

export default function Recordings() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const params = useLocalSearchParams<{ uri?: string; name?: string }>();

    useEffect(() => {
        const q = query(
            collection(FIRESTORE_DB, 'notes'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const recordingsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Recording[];

            setRecordings(recordingsList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (params.uri && params.name) {
            processRecording(params.uri, params.name);
            router.setParams({ uri: undefined, name: undefined });
        }
    }, [params.uri, params.name]);

    const handleDeleteRecording = (id: string, name: string) => {
        Alert.alert(
            'Delete Recording',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(FIRESTORE_DB, 'notes', id));
                        } catch (error) {
                            console.error('Delete error:', error);
                            Alert.alert('Error', 'Failed to delete recording');
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Just now';

        const date = timestamp.toDate();
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const renderRecordingItem = ({ item }: { item: Recording }) => (
        <TouchableOpacity
            style={styles.recordingCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/RecordingDetail?id=${item.id}`)}
        >
            <LinearGradient
                colors={['#ffffff', '#f9fafb']}
                style={styles.cardGradient}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="document-text" size={24} color="#3b82f6" />
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.name || 'Untitled Recording'}
                        </Text>
                        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                    </View>

                    {item.isProcessing ? (
                        <ActivityIndicator size="small" color="#f59e0b" />
                    ) : (
                        <View style={styles.checkContainer}>
                            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        </View>
                    )}
                </View>

                {item.preview && (
                    <Text style={styles.cardPreview} numberOfLines={2}>
                        {item.preview}
                    </Text>
                )}

                <View style={styles.cardFooter}>
                    {item.transcription && (
                        <View style={styles.badge}>
                            <Ionicons name="text" size={12} color="#6b7280" />
                            <Text style={styles.badgeText}>Transcribed</Text>
                        </View>
                    )}
                    {item.notes && (
                        <View style={styles.badge}>
                            <Ionicons name="bulb" size={12} color="#6b7280" />
                            <Text style={styles.badgeText}>Notes</Text>
                        </View>
                    )}
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <LinearGradient
                colors={['#eff6ff', '#dbeafe']}
                style={styles.emptyIconContainer}
            >
                <Ionicons name="mic-outline" size={48} color="#3b82f6" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Recordings Yet</Text>
            <Text style={styles.emptyText}>
                Start recording or upload audio to see your recordings here
            </Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Recordings</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>My Recordings</Text>
                    <Text style={styles.headerSubtitle}>
                        {recordings.length} {recordings.length === 1 ? 'recording' : 'recordings'}
                    </Text>
                </View>
            </View>

            <FlatList
                data={recordings}
                renderItem={renderRecordingItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContainer,
                    recordings.length === 0 && styles.listContainerEmpty
                ]}
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    listContainerEmpty: {
        flex: 1,
        justifyContent: 'center',
    },
    recordingCard: {
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardGradient: {
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    cardDate: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    checkContainer: {
        width: 24,
        height: 24,
    },
    cardPreview: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
    },
});
