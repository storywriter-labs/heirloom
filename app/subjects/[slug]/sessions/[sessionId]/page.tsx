'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Session {
    id: number;
    title: string | null;
    status: string;
    created_at: string;
    subject: {
        id: number;
        name: string;
    };
}

interface Transcript {
    id: number;
    transcript_text: string;
    source: string;
    status: string;
}

interface Narrative {
    id: number;
    narrative_text: string;
    format: string;
    status: string;
    share_token: string;
}

export default function SessionPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const sessionId = params.sessionId;

    const [session, setSession] = useState<Session | null>(null);
    const [transcript, setTranscript] = useState<Transcript | null>(null);
    const [narrative, setNarrative] = useState<Narrative | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [synthesising, setSynthesising] = useState(false);
    const [format, setFormat] = useState<'memoir' | 'letter' | 'timeline'>('memoir');

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
            return;
        }

        apiFetch(`/heirloom/v1/sessions/${sessionId}`)
            .then(data => {
                setSession(data);
                if (data.status === 'transcribed') {
                    return apiFetch(`/heirloom/v1/sessions/${sessionId}/transcript`);
                }
            })
            .then(transcriptData => {
                if (transcriptData) setTranscript(transcriptData);
            })
            .catch(() => setError('Failed to load session'))
            .finally(() => setLoading(false));
    }, [sessionId, router]);

    async function handleSynthesise() {
        if (!transcript || !session) return;
        setSynthesising(true);
        setError('');

        try {
            const result = await apiFetch(
                `/heirloom/v1/subjects/${session.subject.id}/narratives`,
                {
                    method: 'POST',
                    body: JSON.stringify({ format, transcript_id: transcript.id }),
                }
            );
            setNarrative(result);
        } catch (err) {
            setError('Failed to generate narrative. Please try again.');
        } finally {
            setSynthesising(false);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-sm text-gray-400">Loading...</p>
            </main>
        );
    }

    if (error && !session) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-sm text-red-500">{error}</p>
            </main>
        );
    }

    const sessionLabel = session?.title ?? `Session ${session?.id}`;

    return (
        <main className="min-h-screen bg-gray-50">

            {/* Nav */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4">
                <h1 className="text-lg font-semibold text-gray-900">Heirloom</h1>
            </nav>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

                <Breadcrumbs items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: session?.subject?.name ?? slug, href: `/subjects/${slug}` },
                    { label: sessionLabel },
                ]} />

                {/* Session header */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{sessionLabel}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${session?.status === 'transcribed'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-yellow-50 text-yellow-600'
                            }`}>
                            {session?.status}
                        </span>
                        <span className="text-xs text-gray-400">
                            {session?.created_at
                                ? new Date(session.created_at).toLocaleDateString()
                                : ''}
                        </span>
                    </div>
                </div>

                {/* Transcript */}
                {transcript && (
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                Transcript
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${transcript.source === 'audio'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-purple-50 text-purple-600'
                                }`}>
                                {transcript.source}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                            {transcript.transcript_text}
                        </p>
                    </div>
                )}

                {/* Narrative synthesis */}
                {transcript && !narrative && (
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                            Generate narrative
                        </h3>

                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">Choose a format:</p>
                            <div className="grid grid-cols-3 gap-3">
                                {(['memoir', 'letter', 'timeline'] as const).map(f => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setFormat(f)}
                                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${format === f
                                            ? 'border-gray-900 bg-gray-900 text-white'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                                {format === 'memoir' && 'A first-person narrative in their voice.'}
                                {format === 'letter' && 'A letter addressed to future generations.'}
                                {format === 'timeline' && 'Key life moments in chronological order.'}
                            </div>
                        </div>

                        <button
                            onClick={handleSynthesise}
                            disabled={synthesising}
                            className="w-full bg-gray-900 text-white text-sm py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {synthesising ? 'Generating — this may take a moment...' : 'Generate narrative'}
                        </button>
                    </div>
                )}

                {/* Narrative output */}
                {narrative && (
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                Narrative
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 capitalize">
                                {narrative.format}
                            </span>
                        </div>

                        <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap font-serif">
                            {narrative.narrative_text}
                        </p>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-xs text-gray-400">
                                Share this story
                            </p>
                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/share/${narrative.share_token}`;
                                    navigator.clipboard.writeText(url);
                                }}
                                className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Copy share link
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
