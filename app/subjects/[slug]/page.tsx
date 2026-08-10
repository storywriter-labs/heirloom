'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { resolveSubjectBySlug } from '@/lib/slug';
import Breadcrumbs from '@/app/components/Breadcrumbs';

interface Subject {
    id: number;
    name: string;
    birth_year: number | null;
    places_lived: string | null;
    education_profession: string | null;
    family_structure: string | null;
    life_chapters: string | null;
    interests: string | null;
    created_at: string;
}

interface Session {
    id: number;
    title: string | null;
    status: string;
    created_at: string;
}

export default function SubjectPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
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

                return Promise.all([
                    apiFetch(`/heirloom/v1/subjects/${resolved.id}`),
                    apiFetch(`/heirloom/v1/sessions?subject_id=${resolved.id}`),
                ]);
            })
            .then(([subjectData, sessionsData]) => {
                setSubject(subjectData);
                setSessions(sessionsData.data);
            })
            .catch(() => setError('Failed to load subject'))
            .finally(() => setLoading(false));
    }, [slug, router]);

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-sm text-gray-400">Loading...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-sm text-red-500">{error}</p>
            </main>
        );
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
                    { label: subject?.name ?? slug },
                ]} />

                {/* Subject header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{subject?.name}</h2>
                        {subject?.birth_year && (
                            <p className="text-sm text-gray-400 mt-0.5">b. {subject.birth_year}</p>
                        )}
                    </div>
                    <button
                        onClick={() => router.push(`/subjects/${slug}/sessions/new`)}
                        className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        + New session
                    </button>
                </div>

                {/* Profile */}
                <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 mb-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Profile</h3>

                    {[
                        { label: 'Places lived', value: subject?.places_lived },
                        { label: 'Education & profession', value: subject?.education_profession },
                        { label: 'Family', value: subject?.family_structure },
                        { label: 'Life chapters', value: subject?.life_chapters },
                        { label: 'Interests', value: subject?.interests },
                    ].map(field => field.value ? (
                        <div key={field.label}>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{field.label}</p>
                            <p className="text-sm text-gray-700">{field.value}</p>
                        </div>
                    ) : null)}
                </div>

                {/* Sessions */}
                <div className="bg-white rounded-xl border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sessions</h3>
                        <button
                            onClick={() => router.push(`/subjects/${slug}/sessions/new`)}
                            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            + Add session
                        </button>
                    </div>

                    <ul className="divide-y divide-gray-100">
                        {sessions.length === 0 ? (
                            <li className="px-6 py-8 text-center">
                                <p className="text-sm text-gray-400">No sessions yet.</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Start by recording or typing a conversation.
                                </p>
                            </li>
                        ) : (
                            sessions.map(session => (
                                <li
                                    key={session.id}
                                    onClick={() => router.push(`/subjects/${slug}/sessions/${session.id}`)}
                                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {session.title ?? `Session ${session.id}`}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(session.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${session.status === 'transcribed'
                                            ? 'bg-green-50 text-green-600'
                                            : session.status === 'synthesised'
                                                ? 'bg-blue-50 text-blue-600'
                                                : 'bg-yellow-50 text-yellow-600'
                                            }`}>
                                            {session.status}
                                        </span>
                                        <span className="text-gray-300">›</span>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

            </div>
        </main>
    );
}
