import { useState } from 'react';
import { Alert } from 'react-native';
import { addDoc, collection, serverTimestamp } from "@firebase/firestore";
import { FIRESTORE_DB, FIREBASE_AI } from "@/utils/FirebaseConfig";
import { getGenerativeModel } from "firebase/ai";
import { useRouter } from 'expo-router';
import { getApiUrl } from '@/utils/apiUrl';

export const useTranscriptionAndStorage = (uri: string | undefined) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
    const [transcription, setTranscription] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSaved, setIsSaved] = useState(false);
    const [hasNoSpeech, setHasNoSpeech] = useState(false);

    const handleTranscribe = async () => {
        if (!uri) {
            Alert.alert('Error', 'No recording found');
            return;
        }

        setIsLoading(true);
        setHasNoSpeech(false);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4) return;

                setIsLoading(false);

                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);

                        if (response.transcription && response.transcription.trim().length > 0) {
                            setTranscription(response.transcription);
                            setHasNoSpeech(false);
                            generateNotes(response.transcription);
                        } else {
                            setTranscription('');
                            setNotes('');
                            setHasNoSpeech(true);
                        }
                        resolve(response);
                    } catch (e) {
                        Alert.alert('Error', 'Failed to parse response');
                        reject('Failed to parse response');
                    }
                } else {
                    Alert.alert('Error', 'Failed to transcribe audio');
                    reject('Request failed');
                }
            };

            xhr.onerror = () => {
                setIsLoading(false);
                Alert.alert('Error', 'Network request failed');
                reject('Network error');
            };

            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                name: 'audio.m4a',
                type: 'audio/x-m4a'
            } as any);

            const apiUrl = getApiUrl();
            xhr.open('POST', `${apiUrl}/S2T`);
            xhr.send(formData);
        });
    };

    const generateNotes = async (transcriptionText: string) => {
        if (!transcriptionText || transcriptionText.trim().length === 0) {
            setNotes('');
            return;
        }

        setIsGeneratingNotes(true);

        try {
            const model = getGenerativeModel(FIREBASE_AI, {
                model: "gemini-2.0-flash-exp"
            });

            const prompt = `You are an expert note-taker. Convert this transcription into well-structured, comprehensive notes.

Transcription:
${transcriptionText}

Please format your response EXACTLY as follows:

# Summary
Write a concise 2-3 sentence overview of the main topic and purpose of this transcription.

# Key Points
• First key point (one clear sentence)
• Second key point (one clear sentence)
• Third key point (one clear sentence)
• Fourth key point (if applicable)
• Fifth key point (if applicable)

# Detailed Explanation of Key Points
For each key point mentioned above, provide a detailed explanation:

## Point 1: [Title from key point]
Provide 2-3 paragraphs explaining this point in detail. Include context, examples, and any relevant information from the transcription.

## Point 2: [Title from key point]
Provide 2-3 paragraphs explaining this point in detail. Include context, examples, and any relevant information from the transcription.

## Point 3: [Title from key point]
Provide 2-3 paragraphs explaining this point in detail. Include context, examples, and any relevant information from the transcription.

(Continue for all key points)

Make the notes comprehensive, well-organized, and easy to understand.`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const generatedNotes = response.text();

            setNotes(generatedNotes);
            setIsGeneratingNotes(false);

        } catch (error) {
            console.error('Error generating notes:', error);
            setIsGeneratingNotes(false);
            setNotes('');
            Alert.alert('Warning', 'Notes generation failed, but transcription is saved');
        }
    };

    const saveToFirestore = async () => {
        if (!transcription || transcription.trim().length === 0 || isSaved) {
            return;
        }

        if (isGeneratingNotes) {
            return;
        }

        try {
            await addDoc(collection(FIRESTORE_DB, 'notes'), {
                preview: transcription.length > 40
                    ? transcription.slice(0, 40) + "..."
                    : transcription,
                transcription: transcription,
                notes: notes || '',
                audioUri: uri,
                createdAt: serverTimestamp()
            });
            setIsSaved(true);
        } catch (error) {
            console.error('Save error:', error);
        }
    };

    return {
        isLoading,
        isGeneratingNotes,
        transcription,
        notes,
        isSaved,
        hasNoSpeech,
        handleTranscribe,
        saveToFirestore
    };
};
