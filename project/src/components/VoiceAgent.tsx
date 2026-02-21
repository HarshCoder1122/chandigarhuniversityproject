import React, { useState, useEffect, useRef } from 'react';
import { Mic, PhoneOff, Loader2, Sparkles } from 'lucide-react';

const GEMINI_API_KEY = "REMOVED_SECRET";
const GEMINI_HOST = "generativelanguage.googleapis.com";
const WS_URL = `wss://${GEMINI_HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

const VoiceAgent: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const playbackTimeRef = useRef<number>(0);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            endCall();
        };
    }, []);

    const startAudioCapture = async (ws: WebSocket) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } });
            streamRef.current = stream;

            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass({ sampleRate: 16000 });
            audioCtxRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Convert Float32 to Int16
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    let s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                // Convert Int16Array to Base64
                const buffer = new ArrayBuffer(pcm16.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < pcm16.length; i++) {
                    view.setInt16(i * 2, pcm16[i], true); // little-endian
                }

                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = btoa(binary);

                ws.send(JSON.stringify({
                    realtimeInput: {
                        mediaChunks: [{
                            mimeType: "audio/pcm;rate=16000",
                            data: base64Data
                        }]
                    }
                }));
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);
        } catch (err) {
            console.error("Error capturing audio:", err);
            setErrorMessage("Microphone access denied or unavailable.");
            setStatus('error');
            ws.close();
        }
    };

    const playPcmAudio = (base64Data: string) => {
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return;

        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }

        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }

        // Gemini Multimodal Live uses 24kHz for its output audio
        const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (playbackTimeRef.current < now) {
            playbackTimeRef.current = now;
        }
        source.start(playbackTimeRef.current);
        playbackTimeRef.current += buffer.duration;
    };

    const startCall = () => {
        setStatus('connecting');
        setErrorMessage('');

        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = async () => {
                setStatus('connected');

                const setupMsg = {
                    setup: {
                        model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: "Aoede"
                                    }
                                }
                            }
                        },
                        systemInstruction: {
                            parts: [{
                                text: `You are Hardini AI, an expert agricultural assistant designed for Indian farmers. 
                                Strict Rules:
                                1. You must ONLY answer questions related to agriculture, farming, crops, weather, soil, and market prices. If a user asks anything else, politely decline.
                                2. You must speak primarily in conversational Hindi/Hinglish (e.g., 'Hello, m aapki kesi madad kr skti hu?').
                                3. Keep responses extremely short, fast, and concise (1-2 sentences max) as this is a real-time voice call.`
                            }]
                        }
                    }
                };
                ws.send(JSON.stringify(setupMsg));

                // Force immediate welcome greeting to mask latency
                const initialGreeting = {
                    clientContent: {
                        turns: [{
                            role: "user",
                            parts: [{ text: "Start the conversation by saying exactly this and nothing else: 'Hello I am Hardini AI, m aapki kesi madad kr skti hu'" }]
                        }],
                        turnComplete: true
                    }
                };

                // Give the setup message 100ms to process before firing the prompt
                setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(initialGreeting));
                    }
                }, 100);

                playbackTimeRef.current = 0;
                await startAudioCapture(ws);
            };

            ws.onmessage = async (event) => {
                let msg;
                if (event.data instanceof Blob) {
                    const text = await event.data.text();
                    msg = JSON.parse(text);
                } else {
                    msg = JSON.parse(event.data);
                }

                if (msg.serverContent && msg.serverContent.modelTurn) {
                    const parts = msg.serverContent.modelTurn.parts;
                    for (let part of parts) {
                        if (part.inlineData && part.inlineData.data) {
                            playPcmAudio(part.inlineData.data);
                        }
                    }
                }
            };

            ws.onclose = () => {
                endCall();
            };

            ws.onerror = (err) => {
                console.error("WebSocket Error:", err);
                setErrorMessage('Connection error. Please try again.');
                endCall();
            };

        } catch (err: any) {
            console.error('Call failed:', err);
            setErrorMessage(err.message || 'Connection failed.');
            setStatus('error');
        }
    };

    const endCall = () => {
        setStatus('idle');

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(console.error);
            audioCtxRef.current = null;
        }
    };

    return (
        <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-w-md mx-auto animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-500/20 rounded-full">
                    <Sparkles className="text-yellow-500 w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white font-outfit">Gemini Multimodal Live</h3>
                    <p className="text-xs text-gray-400">Ultra-fast Realtime Voice Model</p>
                </div>
            </div>

            {status === 'connected' ? (
                <div className="text-center py-10">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-2xl animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-yellow-400 to-yellow-600 p-8 rounded-full shadow-lg">
                            <Mic className="text-white w-12 h-12" />
                        </div>
                    </div>
                    <p className="mt-6 text-white font-medium animate-pulse">Live with Gemini 2.0 Flash...</p>
                    <button
                        onClick={endCall}
                        className="mt-8 flex items-center gap-2 mx-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all active:scale-95"
                    >
                        <PhoneOff size={18} /> End Conversation
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {errorMessage && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {errorMessage}
                        </div>
                    )}

                    <button
                        onClick={startCall}
                        disabled={status === 'connecting'}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {status === 'connecting' ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Connecting to Google...
                            </>
                        ) : (
                            <>
                                <Mic size={20} />
                                Start Voice Session
                            </>
                        )}
                    </button>

                    <p className="text-[10px] text-gray-500 text-center italic">
                        Uses Web Audio API & WebSockets for raw PCM streaming.
                    </p>
                </div>
            )}
        </div>
    );
};

export default VoiceAgent;
