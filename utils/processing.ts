import { addDoc, collection, serverTimestamp, doc, updateDoc } from "@firebase/firestore";
import { FIRESTORE_DB, FIREBASE_AI } from "@/utils/FirebaseConfig";
import { getGenerativeModel } from "firebase/ai";
import { getApiUrl } from '@/utils/apiUrl';

export const processRecording = async (uri: string, name: string) => {
    try {
        // Save placeholder to Firestore immediately
        const docRef = await addDoc(collection(FIRESTORE_DB, 'notes'), {
            name: name,
            preview: 'Processing...',
            transcription: '',
            formattedTranscription: '',
            notes: '',
            audioUri: uri,
            createdAt: serverTimestamp(),
            isProcessing: true
        });

        // Transcribe in background
        const transcriptionResult = await transcribeAudio(uri);

        if (!transcriptionResult) {
            await updateDoc(doc(FIRESTORE_DB, 'notes', docRef.id), {
                preview: 'No speech detected',
                isProcessing: false
            });
            return;
        }

        // Update with transcription
        await updateDoc(doc(FIRESTORE_DB, 'notes', docRef.id), {
            transcription: transcriptionResult.transcription,
            formattedTranscription: transcriptionResult.formattedTranscription,
            preview: transcriptionResult.transcription.length > 40
                ? transcriptionResult.transcription.slice(0, 40) + "..."
                : transcriptionResult.transcription
        });

        // Generate notes in background
        const notes = await generateNotes(transcriptionResult.formattedTranscription || transcriptionResult.transcription);

        // Update with notes and mark as complete
        await updateDoc(doc(FIRESTORE_DB, 'notes', docRef.id), {
            notes: notes || '',
            isProcessing: false
        });

    } catch (error) {
        console.error('Processing error:', error);
    }
};

const transcribeAudio = async (uri: string): Promise<{ transcription: string; formattedTranscription: string } | null> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;

            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);

                    if (response.transcription && response.transcription.trim().length > 0) {
                        resolve({
                            transcription: response.transcription,
                            formattedTranscription: response.formattedTranscription || response.transcription
                        });
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    reject(e);
                }
            } else {
                reject('Request failed');
            }
        };

        xhr.onerror = () => reject('Network error');

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

const generateNotes = async (transcriptionText: string, retryCount = 0): Promise<string> => {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 5000;

    try {
        const model = getGenerativeModel(FIREBASE_AI, {
            model: "gemini-2.0-flash-exp"
        });

        const prompt = `You are an expert note-taker. Convert this timestamped transcription into well-structured, comprehensive notes.

IMPORTANT: Include timestamps [MM:SS] from the transcription in your notes to show where each concept was discussed.

Transcription with timestamps:
${transcriptionText}

Please format your response EXACTLY as follows:

# Summary
Write a concise 2-3 sentence overview. Include relevant timestamps.

# Key Points
• [MM:SS] First key point (with timestamp)
• [MM:SS] Second key point (with timestamp)
• [MM:SS] Third key point (with timestamp)

# Detailed Explanation of Key Points
## Point 1: [Title]
[MM:SS] Detailed explanation with timestamps...

Make the notes comprehensive and well-organized. ALWAYS include timestamps [MM:SS].`;

        const result = await model.generateContent(prompt);
        return result.response.text();

    } catch (error: any) {
        const isRetryable = error?.toString().includes('429') ||
            error?.toString().includes('overloaded');

        if (isRetryable && retryCount < MAX_RETRIES) {
            const delayMs = BASE_DELAY * Math.pow(2, retryCount);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return generateNotes(transcriptionText, retryCount + 1);
        }

        return '';
    }
};
