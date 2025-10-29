import { View, Text, StyleSheet, TouchableOpacity, Platform, Pressable, LayoutChangeEvent } from 'react-native';
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Ionicons from "@expo/vector-icons/Ionicons";
import { Audio } from "expo-av";

interface AudioPlayerProps {
    uri: string;
    isSaved: boolean;
}

export const AudioPlayer = forwardRef((props: AudioPlayerProps, ref) => {
    const { uri, isSaved } = props;

    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState<number>(0);
    const [position, setPosition] = useState<number>(0);
    const [progressBarWidth, setProgressBarWidth] = useState<number>(0);

    // Expose seekTo method to parent component
    useImperativeHandle(ref, () => ({
        seekTo: async (milliseconds: number) => {
            if (sound) {
                await sound.setPositionAsync(milliseconds);
                await sound.playAsync();  // Auto-play after seeking
            }
        }
    }));

    useEffect(() => {
        loadAudio();
        return () => {
            sound?.unloadAsync();
        };
    }, [uri]);

    const loadAudio = async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: false },
                onPlaybackStatusUpdate
            );
            setSound(newSound);

            const status = await newSound.getStatusAsync();
            if (status.isLoaded) {
                setDuration(status.durationMillis || 0);
            }
        } catch (error) {
            console.error('Error loading audio:', error);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
            }
        }
    };

    const playPauseAudio = async () => {
        if (!sound) return;

        try {
            const status = await sound.getStatusAsync();

            if (status.isLoaded) {
                if (isPlaying) {
                    await sound.pauseAsync();
                } else {
                    if (position >= duration - 100) {
                        await sound.setPositionAsync(0);
                    }
                    await sound.playAsync();
                }
            }
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    };

    const seekBackward = async () => {
        if (!sound) return;
        const newPosition = Math.max(0, position - 10000);
        await sound.setPositionAsync(newPosition);
    };

    const seekForward = async () => {
        if (!sound) return;
        const newPosition = Math.min(duration, position + 10000);
        await sound.setPositionAsync(newPosition);
    };

    const handleProgressBarPress = async (event: any) => {
        if (!sound || duration === 0 || progressBarWidth === 0) return;

        const { locationX } = event.nativeEvent;
        const tapPosition = locationX / progressBarWidth;
        const newPosition = tapPosition * duration;

        await sound.setPositionAsync(Math.max(0, Math.min(duration, newPosition)));
    };

    const onProgressBarLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setProgressBarWidth(width);
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <View style={styles.audioPlayerContainer}>
            <Pressable onPress={handleProgressBarPress} style={styles.progressBarContainer}>
                <View
                    style={styles.progressBarBackground}
                    onLayout={onProgressBarLayout}
                >
                    <View
                        style={[styles.progressBarFill, { width: `${progress}%` }]}
                    />
                    <View
                        style={[styles.progressDot, { left: `${progress}%` }]}
                    />
                </View>
            </Pressable>

            <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.controlsContainer}>
                <TouchableOpacity onPress={seekBackward} style={styles.controlButton}>
                    <Ionicons name="play-back" size={20} color="#6b7280" />
                </TouchableOpacity>

                <TouchableOpacity onPress={playPauseAudio} style={styles.playButton}>
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={24}
                        color="white"
                        style={{ marginLeft: isPlaying ? 0 : 2 }}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={seekForward} style={styles.controlButton}>
                    <Ionicons name="play-forward" size={20} color="#6b7280" />
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    audioPlayerContainer: {
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    progressBarContainer: {
        paddingVertical: 12,
        marginBottom: 8,
    },
    progressBarBackground: {
        height: 4,
        backgroundColor: '#e5e7eb',
        borderRadius: 2,
        position: 'relative',
        overflow: 'visible',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#3b82f6',
        borderRadius: 2,
    },
    progressDot: {
        position: 'absolute',
        top: -4,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3b82f6',
        marginLeft: -6,
        ...Platform.select({
            ios: {
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    timeText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    controlButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
});
