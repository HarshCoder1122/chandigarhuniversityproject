import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Mic, PhoneOff, Loader2, Sparkles } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://chandigarhuniversityproject.onrender.com';

const VoiceAgent: React.FC = () => {
    const [agents, setAgents] = useState<any[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'fetching' | 'connecting' | 'connected' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const roomRef = useRef<Room | null>(null);

    useEffect(() => {
        fetchAgents();
        return () => {
            if (roomRef.current) {
                roomRef.current.disconnect();
            }
        };
    }, []);

    const fetchAgents = async () => {
        setStatus('fetching');
        try {
            const res = await fetch(`${API_BASE}/api/agents`, { method: 'POST' });
            const data = await res.json();
            if (data.data?.agents && data.data.agents.length > 0) {
                const list = data.data.agents;
                setAgents(list);
                // Auto-select first AGT_ agent or just first agent
                const firstAgt = list.find((a: any) => a.id?.startsWith('AGT_')) || list[0];
                setSelectedAgentId(firstAgt.id);
                setStatus('idle');
            } else {
                setErrorMessage('No agents found in your account.');
                setStatus('error');
            }
        } catch (err) {
            console.error('Fetch agents failed:', err);
            setErrorMessage('Failed to load agents.');
            setStatus('error');
        }
    };

    const startCall = async () => {
        if (!selectedAgentId) return;

        setStatus('connecting');
        setErrorMessage('');

        try {
            const res = await fetch(`${API_BASE}/api/livekit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_id: selectedAgentId, customer_number: 'WebUser' })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to start session');

            const { token, livekit_host_url } = data.data || data;

            let host = livekit_host_url;
            if (host.startsWith('https://')) host = host.replace('https://', 'wss://');
            else if (!host.startsWith('ws')) host = 'wss://' + host;

            const room = new Room();
            roomRef.current = room;

            room.on(RoomEvent.Connected, async () => {
                await room.localParticipant.setMicrophoneEnabled(true);
                setStatus('connected');
            });

            room.on(RoomEvent.Disconnected, () => {
                setStatus('idle');
                roomRef.current = null;
            });

            room.on(RoomEvent.TrackSubscribed, (track) => {
                if (track.kind === Track.Kind.Audio) {
                    const element = track.attach();
                    document.body.appendChild(element);
                }
            });

            await room.connect(host, token);

        } catch (err: any) {
            console.error('Call failed:', err);
            setErrorMessage(err.message || 'Connection failed.');
            setStatus('error');
        }
    };

    const endCall = () => {
        if (roomRef.current) {
            roomRef.current.disconnect();
        }
    };

    return (
        <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-w-md mx-auto animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-500/20 rounded-full">
                    <Sparkles className="text-yellow-500 w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white font-outfit">Hardini AI Voice</h3>
                    <p className="text-xs text-gray-400">Interactive WebRTC Session</p>
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
                    <p className="mt-6 text-white font-medium animate-pulse">Live with Hardini...</p>
                    <button
                        onClick={endCall}
                        className="mt-8 flex items-center gap-2 mx-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all active:scale-95"
                    >
                        <PhoneOff size={18} /> End Conversation
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Select Voice Agent</label>
                        <select
                            value={selectedAgentId}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            disabled={status !== 'idle'}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                        >
                            {agents.map((agent) => (
                                <option key={agent.id} value={agent.id} className="bg-gray-900">
                                    {agent.name} {agent.id.startsWith('AGT_') ? '(Web)' : '(PSTN)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {errorMessage && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {errorMessage}
                        </div>
                    )}

                    <button
                        onClick={startCall}
                        disabled={status === 'connecting' || !selectedAgentId}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {status === 'connecting' ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Mic size={20} />
                                Start Voice Session
                            </>
                        )}
                    </button>

                    <p className="text-[10px] text-gray-500 text-center italic">
                        Uses WebRTC for zero-latency communication.
                    </p>
                </div>
            )}
        </div>
    );
};

export default VoiceAgent;
