import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { addDoc, collection, serverTimestamp, doc, updateDoc } from "@firebase/firestore";
import { FIRESTORE_DB, FIREBASE_AI } from "@/utils/FirebaseConfig";
import { getGenerativeModel } from "firebase/ai";
import { useRouter } from 'expo-router';
import { getApiUrl } from '@/utils/apiUrl';

export const useTranscriptionAndStorage = (uri: string | undefined, name?: string) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
    const [transcription, setTranscription] = useState<string>('');
    const [formattedTranscription, setFormattedTranscription] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSaved, setIsSaved] = useState(false);
    const [hasNoSpeech, setHasNoSpeech] = useState(false);
    const [recordingName, setRecordingName] = useState(name || 'Untitled Recording');
    const [docId, setDocId] = useState<string | null>(null);

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
                            setFormattedTranscription(response.formattedTranscription || response.transcription);
                            setHasNoSpeech(false);
                            generateNotes(response.formattedTranscription || response.transcription);
                        } else {
                            setTranscription('');
                            setFormattedTranscription('');
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

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const isRetryableError = (error: any): boolean => {
        const errorString = error?.toString() || '';
        return (
            errorString.includes('429') ||
            errorString.includes('GEMINI_DEVELOPER_OVERLOADED') ||
            errorString.includes('overloaded') ||
            errorString.includes('quota') ||
            errorString.includes('rate limit')
        );
    };

    const generateNotes = async (transcriptionText: string, retryCount = 0) => {
        const MAX_RETRIES = 3;
        const BASE_DELAY = 5000;

        if (!transcriptionText || transcriptionText.trim().length === 0) {
            setNotes('');
            return;
        }

        setIsGeneratingNotes(true);

        try {
            const model = getGenerativeModel(FIREBASE_AI, {
                model: "gemini-2.0-flash-exp"
            });

            const prompt = `You are an expert note-taker. Convert this timestamped transcription into well-structured, comprehensive notes.

IMPORTANT: Include timestamps [MM:SS] from the transcription in your notes to show where each concept was discussed. Users will click these timestamps to jump to that part of the audio.

Transcription with timestamps:
${transcriptionText}

Please format your response EXACTLY as follows:

# Summary
Write a concise 2-3 sentence overview of the main topic and purpose of this transcription. Include relevant timestamps where key points were made.

# Key Points
• [MM:SS] First key point (one clear sentence with timestamp)
• [MM:SS] Second key point (one clear sentence with timestamp)
• [MM:SS] Third key point (one clear sentence with timestamp)
• [MM:SS] Fourth key point (if applicable)
• [MM:SS] Fifth key point (if applicable)

# Detailed Explanation of Key Points
For each key point mentioned above, provide a detailed explanation:

## Point 1: [Title from key point]
[MM:SS] Start with the timestamp where this concept begins.

Provide 2-3 paragraphs explaining this point in detail. Include context, examples, and any relevant information from the transcription. Reference specific timestamps [MM:SS] when mentioning important details or examples.

## Point 2: [Title from key point]
[MM:SS] Start with the timestamp where this concept begins.

Provide 2-3 paragraphs explaining this point in detail. Include timestamps for specific examples or important statements.

## Point 3: [Title from key point]
[MM:SS] Start with the timestamp where this concept begins.

Provide 2-3 paragraphs explaining this point in detail with relevant timestamps.

(Continue for all key points)

Make the notes comprehensive, well-organized, and easy to understand. ALWAYS include timestamps [MM:SS] so users can reference the exact moment in the audio.`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const generatedNotes = response.text();

            setNotes(generatedNotes);
            setIsGeneratingNotes(false);

        } catch (error: any) {
            console.error(`Gemini error (attempt ${retryCount + 1}):`, error);

            if (isRetryableError(error) && retryCount < MAX_RETRIES) {
                const delayMs = BASE_DELAY * Math.pow(2, retryCount);
                console.log(`Retrying in ${delayMs/1000}s...`);
                await sleep(delayMs);
                return generateNotes(transcriptionText, retryCount + 1);
            }

            console.error('Gemini failed after retries');
            setIsGeneratingNotes(false);
            setNotes('');
        }
    };

    const saveToFirestore = async () => {
        if (!transcription || transcription.trim().length === 0 || isSaved) {
            return;
        }

        try {
            const docRef = await addDoc(collection(FIRESTORE_DB, 'notes'), {
                name: recordingName,
                preview: transcription.length > 40
                    ? transcription.slice(0, 40) + "..."
                    : transcription,
                transcription: transcription,
                formattedTranscription: formattedTranscription,
                notes: notes || '',
                audioUri: uri,
                createdAt: serverTimestamp(),
                isProcessing: isGeneratingNotes  // Mark as processing if notes not ready
            });

            setDocId(docRef.id);
            setIsSaved(true);

        } catch (error) {
            console.error('Save error:', error);
        }
    };

    // Update Firestore when notes are ready
    useEffect(() => {
        if (docId && notes && !isGeneratingNotes) {
            updateDoc(doc(FIRESTORE_DB, 'notes', docId), {
                notes: notes,
                isProcessing: false
            }).catch(console.error);
        }
    }, [docId, notes, isGeneratingNotes]);

    return {
        isLoading,
        isGeneratingNotes,
        transcription,
        formattedTranscription,
        notes,
        isSaved,
        hasNoSpeech,
        recordingName,
        handleTranscribe,
        saveToFirestore
    };
};
