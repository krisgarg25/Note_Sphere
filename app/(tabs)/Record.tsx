import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform, Modal, TextInput } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio, InterruptionModeAndroid } from 'expo-av';
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';

export default function Record() {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [showNameModal, setShowNameModal] = useState(false);
    const [recordingName, setRecordingName] = useState('');
    const [pendingUri, setPendingUri] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (recording && !isPaused) {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [recording, isPaused]);

    useEffect(() => {
        return () => {
            if (recording) recording.stopAndUnloadAsync().catch(console.error);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return {
            hours: hrs.toString().padStart(2, '0'),
            minutes: mins.toString().padStart(2, '0'),
            seconds: secs.toString().padStart(2, '0')
        };
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}h ${mins}m ${secs}s`;
        } else if (mins > 0) {
            return `${mins}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    const handleUploadAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                return;
            }

            const file = result.assets[0];

            const validTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/m4a', 'audio/x-m4a', 'audio/mp3'];
            if (!validTypes.includes(file.mimeType || '')) {
                Alert.alert('Invalid File', 'Please select a valid audio file (MP3, M4A, WAV)');
                return;
            }

            const maxSize = 100 * 1024 * 1024;
            if (file.size && file.size > maxSize) {
                Alert.alert('File Too Large', 'Please select an audio file smaller than 100MB');
                return;
            }

            // Show name modal for uploaded file
            setPendingUri(file.uri);
            setRecordingName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
            setShowNameModal(true);

        } catch (error) {
            console.error('Error picking audio:', error);
            Alert.alert('Error', 'Failed to select audio file');
        }
    };

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Required", "Audio access is needed to record.");
                return;
            }
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: true,
            });
            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(newRecording);
            setIsPaused(false);
            setDuration(0);
        } catch (err) {
            console.error('Start recording error:', err);
            Alert.alert("Error", "Could not start recording.");
        }
    };

    const pauseRecording = async () => {
        if (!recording || isPaused) return;
        try {
            if (Platform.OS === 'android') {
                await recording.pauseAsync();
                setIsPaused(true);
            } else {
                Alert.alert("iOS Limitation", "Pause is Android-only. Stop and restart if needed.");
            }
        } catch (err) {
            console.error('Pause error:', err);
        }
    };

    const resumeRecording = async () => {
        if (!recording || !isPaused) return;
        try {
            if (Platform.OS === 'android') {
                await recording.startAsync();
                setIsPaused(false);
            }
        } catch (err) {
            console.error('Resume error:', err);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        try {
            if (isPaused && Platform.OS === 'android') {
                await recording.startAsync();
            }
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            setIsPaused(false);

            if (uri) {
                // Show name modal
                setPendingUri(uri);
                const timestamp = new Date().toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                setRecordingName(`Recording ${timestamp}`);
                setShowNameModal(true);
            }
        } catch (err) {
            console.error('Stop error:', err);
            Alert.alert('Error', 'Failed to save recording');
        }
    };

    const handleSaveWithName = async () => {
        if (!pendingUri) return;

        const finalName = recordingName.trim() || 'Untitled Recording';

        try {
            const timestamp = Date.now();
            const fileName = `recording-${timestamp}.m4a`;
            const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

            await FileSystem.copyAsync({
                from: pendingUri,
                to: permanentUri
            });

            // Navigate with name
            router.push(`/Recordings?uri=${encodeURIComponent(permanentUri)}&name=${encodeURIComponent(finalName)}`);

            // Reset
            setDuration(0);
            setPendingUri(null);
            setRecordingName('');
            setShowNameModal(false);

        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save recording');
        }
    };

    const cancelRecording = () => {
        if (!recording) return;
        Alert.alert(
            "Cancel Recording?",
            "This will delete the current recording.",
            [
                { text: "Keep Recording", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (isPaused && Platform.OS === 'android') await recording.startAsync();
                            await recording.stopAndUnloadAsync();
                            setRecording(null);
                            setIsPaused(false);
                            setDuration(0);
                        } catch (err) {
                            console.error('Cancel error:', err);
                        }
                    }
                }
            ]
        );
    };

    const time = formatTime(duration);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#ffffff', '#f8fafc', '#f1f5f9']}
                style={StyleSheet.absoluteFillObject}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Voice Recorder</Text>
                        <Text style={styles.headerSubtitle}>
                            {recording ? (isPaused ? '⏸ Paused' : '● Recording') : 'Ready to record'}
                        </Text>
                    </View>

                    {!recording && (
                        <TouchableOpacity
                            onPress={handleUploadAudio}
                            activeOpacity={0.7}
                            style={styles.uploadButton}
                        >
                            <Ionicons name="cloud-upload-outline" size={22} color="#3b82f6" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.content}>
                    <View style={styles.timerCard}>
                        <LinearGradient
                            colors={recording && !isPaused ? ['#3b82f6', '#2563eb'] : ['#ffffff', '#f8fafc']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.timerGradient}
                        >
                            <View style={styles.timerRow}>
                                <View style={styles.timeUnit}>
                                    <Text style={[styles.timeValue, recording && !isPaused && styles.timeValueActive]}>
                                        {time.hours}
                                    </Text>
                                    <Text style={[styles.timeLabel, recording && !isPaused && styles.timeLabelActive]}>
                                        HOURS
                                    </Text>
                                </View>
                                <Text style={[styles.colon, recording && !isPaused && styles.colonActive]}>:</Text>
                                <View style={styles.timeUnit}>
                                    <Text style={[styles.timeValue, recording && !isPaused && styles.timeValueActive]}>
                                        {time.minutes}
                                    </Text>
                                    <Text style={[styles.timeLabel, recording && !isPaused && styles.timeLabelActive]}>
                                        MINS
                                    </Text>
                                </View>
                                <Text style={[styles.colon, recording && !isPaused && styles.colonActive]}>:</Text>
                                <View style={styles.timeUnit}>
                                    <Text style={[styles.timeValue, recording && !isPaused && styles.timeValueActive]}>
                                        {time.seconds}
                                    </Text>
                                    <Text style={[styles.timeLabel, recording && !isPaused && styles.timeLabelActive]}>
                                        SECS
                                    </Text>
                                </View>
                            </View>

                            {recording && !isPaused && (
                                <View style={styles.statusRow}>
                                    <View style={styles.pulseOuter}>
                                        <View style={styles.pulseInner} />
                                    </View>
                                    <Text style={styles.statusText}>Recording...</Text>
                                </View>
                            )}

                            {isPaused && (
                                <View style={styles.statusRow}>
                                    <Ionicons name="pause-circle" size={18} color="#6b7280" />
                                    <Text style={styles.statusTextPaused}>Paused</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </View>

                    {recording ? (
                        <View style={styles.controlsRow}>
                            <TouchableOpacity onPress={cancelRecording} activeOpacity={0.7} style={styles.controlItem}>
                                <View style={styles.cancelButton}>
                                    <Ionicons name="close" size={24} color="#6b7280" />
                                </View>
                                <Text style={styles.controlLabel}>Cancel</Text>
                            </TouchableOpacity>

                            {Platform.OS === 'android' && (
                                <TouchableOpacity onPress={isPaused ? resumeRecording : pauseRecording} activeOpacity={0.7} style={styles.controlItem}>
                                    <LinearGradient colors={['#8b5cf6', '#6366f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pauseButton}>
                                        <Ionicons name={isPaused ? "play" : "pause"} size={26} color="white" />
                                    </LinearGradient>
                                    <Text style={styles.controlLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity onPress={stopRecording} activeOpacity={0.7} style={styles.controlItem}>
                                <LinearGradient colors={['#f87171', '#ef4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stopButton}>
                                    <View style={styles.stopIcon} />
                                </LinearGradient>
                                <Text style={styles.controlLabel}>Stop</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.micContainer}>
                            <TouchableOpacity onPress={startRecording} activeOpacity={0.85}>
                                <LinearGradient colors={['#3b82f6', '#2563eb', '#1d4ed8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.micButton}>
                                    <View style={styles.micInner}>
                                        <Ionicons name="mic" size={56} color="white" />
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                            <Text style={styles.micLabel}>Tap to Start Recording</Text>

                            <Text style={styles.uploadHint}>
                                or tap <Ionicons name="cloud-upload-outline" size={14} color="#3b82f6" /> above to upload
                            </Text>
                        </View>
                    )}
                </View>
            </SafeAreaView>

            {/* Name Modal */}
            <Modal
                visible={showNameModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNameModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <LinearGradient
                                colors={['#3b82f6', '#2563eb']}
                                style={styles.modalIcon}
                            >
                                <Ionicons name="mic" size={40} color="white" />
                            </LinearGradient>
                        </View>

                        <Text style={styles.modalTitle}>Name Your Recording</Text>
                        <Text style={styles.modalDuration}>Duration: {formatDuration(duration)}</Text>

                        <View style={styles.inputWrapper}>
                            <Ionicons name="create-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={recordingName}
                                onChangeText={setRecordingName}
                                placeholder="Enter a name..."
                                placeholderTextColor="#9ca3af"
                                autoFocus
                                maxLength={50}
                            />
                        </View>

                        <TouchableOpacity onPress={handleSaveWithName} activeOpacity={0.8}>
                            <LinearGradient
                                colors={['#3b82f6', '#2563eb']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.saveButton}
                            >
                                <Ionicons name="checkmark-circle" size={22} color="white" />
                                <Text style={styles.saveButtonText}>Save Recording</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#6b7280',
        marginTop: 4,
        fontWeight: '500',
    },
    uploadButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#bfdbfe',
        ...Platform.select({
            ios: {
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    timerCard: {
        width: '100%',
        marginBottom: 40,
    },
    timerGradient: {
        paddingVertical: 32,
        paddingHorizontal: 24,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        ...Platform.select({
            ios: {
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeUnit: {
        alignItems: 'center',
        minWidth: 70,
    },
    timeValue: {
        fontSize: 48,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -1,
    },
    timeValueActive: {
        color: '#ffffff',
    },
    timeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9ca3af',
        marginTop: 4,
        letterSpacing: 1.2,
    },
    timeLabelActive: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    colon: {
        fontSize: 40,
        fontWeight: '700',
        color: '#d1d5db',
        marginHorizontal: 8,
        marginBottom: 12,
    },
    colonActive: {
        color: 'rgba(255, 255, 255, 0.6)',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 8,
    },
    pulseOuter: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    statusTextPaused: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 20,
    },
    controlItem: {
        alignItems: 'center',
    },
    cancelButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    pauseButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#8b5cf6',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    stopButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#ef4444',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    stopIcon: {
        width: 22,
        height: 22,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    controlLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 8,
    },
    micContainer: {
        alignItems: 'center',
    },
    micButton: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.4,
                shadowRadius: 32,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    micInner: {
        width: 132,
        height: 132,
        borderRadius: 66,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    micLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 20,
    },
    uploadHint: {
        fontSize: 13,
        color: '#9ca3af',
        marginTop: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 32,
        padding: 32,
        width: '100%',
        maxWidth: 400,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.25,
                shadowRadius: 40,
            },
            android: {
                elevation: 20,
            },
        }),
    },
    modalIconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    modalIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    modalDuration: {
        fontSize: 15,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        paddingVertical: 16,
        fontWeight: '500',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
});
