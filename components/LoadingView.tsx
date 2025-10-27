import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import React from 'react';

export const LoadingView = () => {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Transcribing audio...</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280'
    },
});
