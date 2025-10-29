import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { doc, getDoc } from 'firebase/firestore';
import { FIRESTORE_DB } from '@/utils/FirebaseConfig';
import { AudioPlayer } from '@/components/AudioPlayer';

export default function RecordingDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [recording, setRecording] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'transcription' | 'notes'>('transcription');
    const audioPlayerRef = useRef<any>(null);

    useEffect(() => {
        loadRecording();
    }, [id]);

    const loadRecording = async () => {
        if (!id) return;

        try {
            const docRef = doc(FIRESTORE_DB, 'notes', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setRecording({ id: docSnap.id, ...docSnap.data() });
            }
        } catch (error) {
            console.error('Load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTimestampClick = (timestamp: string) => {
        const [minutes, seconds] = timestamp.split(':').map(Number);
        const milliseconds = (minutes * 60 + seconds) * 1000;

        if (audioPlayerRef.current) {
            audioPlayerRef.current.seekTo(milliseconds);
        }
    };

    const renderTextWithTimestamps = (text: string) => {
        const parts = text.split(/(\[\d{2}:\d{2}\])/g);

        return parts.map((part, index) => {
            const timestampMatch = part.match(/\[(\d{2}:\d{2})\]/);

            if (timestampMatch) {
                const timestamp = timestampMatch[1];
                return (
                    <Text
                        key={index}
                        style={styles.timestamp}
                        onPress={() => handleTimestampClick(timestamp)}
                    >
                        [{timestamp}]
                    </Text>
                );
            }

            return <Text key={index}>{part}</Text>;
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!recording) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Recording not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {recording.name || 'Untitled Recording'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {recording.audioUri && (
                <AudioPlayer ref={audioPlayerRef} uri={recording.audioUri} isSaved={true} />
            )}

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'transcription' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('transcription')}
                >
                    <Text style={[styles.tabText, activeTab === 'transcription' && styles.tabTextActive]}>
                        Transcription
                    </Text>
                    {activeTab === 'transcription' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'notes' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('notes')}
                >
                    <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>
                        Notes
                    </Text>
                    {activeTab === 'notes' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.contentScroll}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'transcription' && (
                    <View style={styles.contentCard}>
                        {recording.formattedTranscription || recording.transcription ? (
                            <Text style={styles.contentText}>
                                {renderTextWithTimestamps(recording.formattedTranscription || recording.transcription)}
                            </Text>
                        ) : (
                            <Text style={styles.emptyText}>No transcription available</Text>
                        )}
                    </View>
                )}

                {activeTab === 'notes' && (
                    <View style={styles.contentCard}>
                        {recording.notes ? (
                            <Text style={styles.contentText}>
                                {renderTextWithTimestamps(recording.notes)}
                            </Text>
                        ) : (
                            <Text style={styles.emptyText}>No notes available</Text>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#9ca3af',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
        gap: 8,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        position: 'relative',
    },
    tabButtonActive: {},
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#9ca3af',
    },
    tabTextActive: {
        color: '#111827',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#3b82f6',
        borderRadius: 1,
    },
    contentScroll: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    contentCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    contentText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#374151',
    },
    timestamp: {
        color: '#3b82f6',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
