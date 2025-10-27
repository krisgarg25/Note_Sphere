import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranscriptionAndStorage } from '@/utils/transcriptionAndStorage';
import { AudioPlayer } from '@/components/AudioPlayer';
import { LoadingView } from '@/components/LoadingView';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Recordings() {
    const { uri } = useLocalSearchParams<{ uri?: string }>();
    const {
        isLoading,
        isGeneratingNotes,
        transcription,
        notes,
        isSaved,
        hasNoSpeech, // NEW
        handleTranscribe,
        saveToFirestore
    } = useTranscriptionAndStorage(uri);

    const [activeTab, setActiveTab] = useState<'transcription' | 'notes'>('transcription');

    useEffect(() => {
        if (!uri) return;
        handleTranscribe();
    }, [uri]);

    useEffect(() => {
        if (transcription && !isSaved && !isGeneratingNotes) {
            saveToFirestore();
        }
    }, [transcription, isGeneratingNotes]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {isLoading ? (
                <LoadingView />
            ) : (
                <>
                    {/* Show "No Speech Detected" if hasNoSpeech flag is true */}
                    {hasNoSpeech && (
                        <View style={styles.noSpeechContainer}>
                            <Ionicons name="volume-mute-outline" size={64} color="#ef4444" />
                            <Text style={styles.noSpeechTitle}>No Speech Detected</Text>
                            <Text style={styles.noSpeechText}>
                                The recording did not contain any speech. Please try recording again with clear audio.
                            </Text>
                        </View>
                    )}

                    {transcription && (
                        <>
                            {/* Audio Player */}
                            {uri && <AudioPlayer uri={uri} isSaved={isSaved} />}

                            {/* Tab Buttons */}
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.tabButton,
                                        activeTab === 'transcription' && styles.tabButtonActive
                                    ]}
                                    onPress={() => setActiveTab('transcription')}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            activeTab === 'transcription' && styles.tabTextActive
                                        ]}
                                    >
                                        Transcription
                                    </Text>
                                    {activeTab === 'transcription' && (
                                        <View style={styles.activeIndicator} />
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.tabButton,
                                        activeTab === 'notes' && styles.tabButtonActive
                                    ]}
                                    onPress={() => setActiveTab('notes')}
                                >
                                    <Text
                                        style={[
                                            styles.tabText,
                                            activeTab === 'notes' && styles.tabTextActive
                                        ]}
                                    >
                                        Notes
                                    </Text>
                                    {activeTab === 'notes' && (
                                        <View style={styles.activeIndicator} />
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Content Area */}
                            <ScrollView
                                style={styles.contentScroll}
                                contentContainerStyle={styles.contentContainer}
                                showsVerticalScrollIndicator={false}
                            >
                                {activeTab === 'transcription' && (
                                    <View style={styles.contentCard}>
                                        <Text style={styles.contentText}>{transcription}</Text>
                                    </View>
                                )}

                                {activeTab === 'notes' && (
                                    <>
                                        {isGeneratingNotes ? (
                                            <View style={styles.generatingContainer}>
                                                <Ionicons name="sparkles" size={24} color="#3b82f6" />
                                                <Text style={styles.generatingText}>
                                                    Generating notes with AI...
                                                </Text>
                                            </View>
                                        ) : notes ? (
                                            <View style={styles.contentCard}>
                                                <Text style={styles.contentText}>{notes}</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.emptyState}>
                                                <Ionicons name="document-outline" size={48} color="#d1d5db" />
                                                <Text style={styles.emptyText}>No notes available</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </ScrollView>
                        </>
                    )}

                    {/* Only show "Waiting" if NOT loading and NO transcription and NO noSpeech flag */}
                    {!transcription && !isLoading && !hasNoSpeech && (
                        <View style={styles.emptyState}>
                            <Ionicons name="mic-off-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>Waiting for transcription...</Text>
                        </View>
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff'
    },
    noSpeechContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    noSpeechTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#ef4444',
        marginTop: 20,
        marginBottom: 12,
    },
    noSpeechText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
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
    generatingContainer: {
        backgroundColor: '#eff6ff',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    generatingText: {
        fontSize: 15,
        color: '#1e40af',
        fontWeight: '500',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
        marginTop: 16,
    },
});
