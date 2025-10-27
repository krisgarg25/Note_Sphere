const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new Response(
                JSON.stringify({ error: 'No file provided' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Step 1: Upload to AssemblyAI
        const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: { 'authorization': ASSEMBLYAI_KEY! },
            body: file
        });

        const { upload_url } = await uploadResponse.json();

        // Step 2: Request transcription
        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                'authorization': ASSEMBLYAI_KEY!,
                'content-type': 'application/json',
            },
            body: JSON.stringify({ audio_url: upload_url })
        });

        const { id } = await transcriptResponse.json();

        // Step 3: Poll for result
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
                    JSON.stringify({
                        error: 'Transcription failed',
                        details: transcript.error
                    }),
                    {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        if (!transcript || transcript.status !== 'completed') {
            return new Response(
                JSON.stringify({ error: 'Transcription timeout' }),
                {
                    status: 408,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Return only transcription (Gemini will be called client-side)
        return new Response(
            JSON.stringify({
                transcription: transcript.text || '',
                words: transcript.words,
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
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
