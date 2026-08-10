'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { resolveSubjectBySlug } from '@/lib/slug';
import Breadcrumbs from '@/app/components/Breadcrumbs';

type InputType = 'manual' | 'audio';

export default function NewSessionPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;

    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [subjectName, setSubjectName] = useState('');
    const [inputType, setInputType] = useState<InputType>('manual');
    const [title, setTitle] = useState('');
    const [transcriptText, setTranscriptText] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
            return;
        }

        apiFetch('/heirloom/v1/subjects')
            .then(({ data: allSubjects }) => {
                const resolved = resolveSubjectBySlug(slug, allSubjects);
                if (!resolved) throw new Error('Subject not found');
                setSubjectId(resolved.id);
                setSubjectName(resolved.name);
            })
            .catch(() => router.push('/dashboard'));
    }, [slug, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!subjectId) return;
        setError('');
        setLoading(true);

        try {
            const session = await apiFetch('/heirloom/v1/sessions', {
                method: 'POST',
                body: JSON.stringify({
                    subject_id: subjectId,
                    title: title || null,
                }),
            });

            if (inputType === 'manual') {
                await apiFetch(`/heirloom/v1/sessions/${session.id}/transcript`, {
                    method: 'POST',
                    body: JSON.stringify({ transcript_text: transcriptText }),
                });
            } else if (inputType === 'audio' && audioFile) {
                const formData = new FormData();
                formData.append('audio', audioFile);

                const token = localStorage.getItem('auth_token');
                await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/heirloom/v1/sessions/${session.id}/transcribe`,
                    {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: formData,
                    }
                );
            }

            router.push(`/subjects/${slug}/sessions/${session.id}`);

        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-50">

            {/* Nav */}
            <nav className="bg-white border-b border-gray-100 px-6 py-4">
                <h1 className="text-lg font-semibold text-gray-900">Heirloom</h1>
            </nav>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                <Breadcrumbs items={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: subjectName || slug, href: `/subjects/${slug}` },
                    { label: 'New session' },
                ]} />

                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900">New session</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Add a conversation — type it out or upload a recording.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Session title <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Childhood memories, The war years"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                    </div>

                    {/* Input type toggle */}
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <p className="text-sm font-medium text-gray-700 mb-3">How are you adding this conversation?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setInputType('manual')}
                                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${inputType === 'manual'
                                    ? 'border-gray-900 bg-gray-900 text-white'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                Type or paste text
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputType('audio')}
                                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${inputType === 'audio'
                                    ? 'border-gray-900 bg-gray-900 text-white'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                    }`}
                            >
                                Upload audio
                            </button>
                        </div>
                    </div>

                    {/* Manual text input */}
                    {inputType === 'manual' && (
                        <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Conversation transcript <span className="text-red-400">*</span>
                            </label>
                            <p className="text-xs text-gray-400 mb-2">
                                Paste or type the conversation. Q&A format works well.
                            </p>
                            <textarea
                                value={transcriptText}
                                onChange={e => setTranscriptText(e.target.value)}
                                required={inputType === 'manual'}
                                rows={12}
                                placeholder="Q: Can you tell me about where you grew up?&#10;A: Oh, it was a very small place..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none font-mono"
                            />
                            <p className="text-xs text-gray-400 mt-2">
                                Minimum 50 characters required.
                            </p>
                        </div>
                    )}

                    {/* Audio upload */}
                    {inputType === 'audio' && (
                        <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Audio file <span className="text-red-400">*</span>
                            </label>
                            <p className="text-xs text-gray-400 mb-3">
                                Supported formats: mp3, m4a, wav, webm. Max 25MB.
                            </p>
                            <input
                                type="file"
                                accept=".mp3,.m4a,.wav,.webm,.mp4,.mpeg,.mpga"
                                onChange={e => setAudioFile(e.target.files?.[0] ?? null)}
                                required={inputType === 'audio'}
                                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-700 file:cursor-pointer"
                            />
                            {audioFile && (
                                <p className="text-xs text-gray-400 mt-2">
                                    Selected: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)}MB)
                                </p>
                            )}
                            <p className="text-xs text-amber-500 mt-3">
                                Audio will be transcribed automatically. This may take a moment.
                            </p>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={() => router.push(`/subjects/${slug}`)}
                            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !subjectId}
                            className="bg-gray-900 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Save session'}
                        </button>
                    </div>

                </form>
            </div>
        </main>
    );
}
