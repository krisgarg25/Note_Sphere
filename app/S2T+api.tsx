const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new Response(
                JSON.stringify({ error: 'No file provided' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Upload to AssemblyAI
        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: { 'authorization': ASSEMBLYAI_KEY! },
            body: file
        });

        const { upload_url } = await uploadResponse.json();

        // Request transcription with auto_chapters (gives better timestamps)
        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                'authorization': ASSEMBLYAI_KEY!,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                audio_url: upload_url,
                auto_chapters: true,  // Enable chapter detection
                speaker_labels: false  // Don't need speaker detection
            })
        });

        const { id } = await transcriptResponse.json();

        // Poll for result
        let transcript;
        let attempts = 0;
        const maxAttempts = 120;

        while (attempts < maxAttempts) {
            const pollingResponse = await fetch(
                `https://api.assemblyai.com/v2/transcript/${id}`,
                { headers: { 'authorization': ASSEMBLYAI_KEY! } }
            );

            transcript = await pollingResponse.json();

            if (transcript.status === 'completed') break;
            if (transcript.status === 'error') {
                return new Response(
                    JSON.stringify({ error: 'Transcription failed', details: transcript.error }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                );
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        if (!transcript || transcript.status !== 'completed') {
            return new Response(
                JSON.stringify({ error: 'Transcription timeout' }),
                { status: 408, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Format transcription with timestamps per sentence
        const formattedTranscription = formatWithTimestamps(transcript);

        return new Response(
            JSON.stringify({
                transcription: transcript.text || '',
                formattedTranscription: formattedTranscription,  // With timestamps
                chapters: transcript.chapters || [],  // Optional: chapter summaries
                words: transcript.words || [],
                success: true
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            }
        );

    } catch (error) {
        console.error('API Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Helper function to format transcription with timestamps
function formatWithTimestamps(transcript: any): string {
    if (!transcript.words || transcript.words.length === 0) {
        return transcript.text || '';
    }

    const words = transcript.words;
    let result = '';
    let currentSentence = '';
    let sentenceStartTime = words[0].start;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        currentSentence += word.text + ' ';

        // Detect sentence end (., !, ?)
        const isEndOfSentence = /[.!?]$/.test(word.text);
        const isLastWord = i === words.length - 1;

        if (isEndOfSentence || isLastWord) {
            const timestamp = formatTimestamp(sentenceStartTime);
            result += `[${timestamp}] ${currentSentence.trim()}\n\n`;

            // Reset for next sentence
            currentSentence = '';
            if (i < words.length - 1) {
                sentenceStartTime = words[i + 1].start;
            }
        }
    }

    return result.trim();
}

// Format milliseconds to MM:SS
function formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
