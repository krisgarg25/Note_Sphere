import { View, Text, StyleSheet, ScrollView } from 'react-native';
import React from 'react';

interface TranscriptionViewProps {
    transcription: string;
    notes?: string;
}

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
                                                                        transcription,
                                                                        notes
                                                                    }) => {
    return (
        <ScrollView style={styles.scrollContainer}>
            {/* Transcription Section */}
            <View style={styles.transcriptionContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.transcriptionLabel}>Transcription</Text>
                </View>
                <Text style={styles.transcriptionText}>{transcription}</Text>
            </View>

            {/* Notes Section */}
            {notes && (
                <View style={styles.notesContainer}>
                    <View style={styles.headerRow}>
                        <Text style={styles.notesLabel}>AI Generated Notes</Text>
                    </View>
                    <Text style={styles.notesText}>{notes}</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
    },
    transcriptionContainer: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 16,
    },
    notesContainer: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    transcriptionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280'
    },
    notesLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2563eb',
    },
    transcriptionText: {
        fontSize: 16,
        color: '#111827',
        lineHeight: 24
    },
    notesText: {
        fontSize: 16,
        color: '#1e40af',
        lineHeight: 24,
    },
});
