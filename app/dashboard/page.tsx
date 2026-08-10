'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { subjectSlug } from '@/lib/slug';

interface Subject {
    id: number;
    name: string;
    birth_year: number | null;
    sessions_count: number;
    created_at: string;
}

interface Session {
    id: number;
    subject_id: number;
    title: string | null;
    status: string;
    created_at: string;
    subject: {
        id: number;
        name: string;
    };
}

export default function DashboardPage() {
    const router = useRouter();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
            return;
        }

        Promise.all([
            apiFetch('/heirloom/v1/subjects'),
            apiFetch('/heirloom/v1/sessions'),
        ])
            .then(([subjectsData, sessionsData]) => {
                setSubjects(subjectsData.data);
                setSessions(sessionsData.data);
            })
            .catch((err) => {
                console.error(err);
                setError('Failed to load your stories');
            })
            .finally(() => setLoading(false));
    }, [router]);

    function handleLogout() {
        localStorage.removeItem('auth_token');
        router.push('/login');
    }

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
            <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">Heirloom</h1>
                <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    Sign out
                </button>
            </nav>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Your stories</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {subjects.length === 0
                                ? 'Add someone whose story you want to capture'
                                : `${subjects.length} ${subjects.length === 1 ? 'person' : 'people'}`}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/subjects/new')}
                        className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        + Add person
                    </button>
                </div>

                {/* Subjects */}
                {subjects.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 px-8 py-16 text-center">
                        <p className="text-gray-400 text-sm">No stories yet.</p>
                        <p className="text-gray-400 text-sm mt-1">
                            Start by adding the person whose story you want to capture.
                        </p>
                        <button
                            onClick={() => router.push('/subjects/new')}
                            className="mt-6 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            + Add person
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {subjects.map(subject => {

                            const subjectSessions = sessions.filter(
                                s => s.subject_id === subject.id
                            );

                            const latestSession = subjectSessions[0];
                            const slug = subjectSlug(subject, subjects);

                            return (
                                <div
                                    key={subject.id}
                                    onClick={() => router.push(`/subjects/${slug}`)}
                                    className="bg-white rounded-xl border border-gray-100 px-6 py-5 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{subject.name}</p>
                                        {subject.birth_year && (
                                            <p className="text-xs text-gray-400 mt-0.5">b. {subject.birth_year}</p>
                                        )}
                                        {latestSession && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Last session: {new Date(latestSession.created_at).toLocaleDateString()}
                                                {' · '}
                                                <span className={
                                                    latestSession.status === 'transcribed'
                                                        ? 'text-green-500'
                                                        : 'text-yellow-500'
                                                }>
                                                    {latestSession.status}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-gray-400">
                                            {subject.sessions_count}{' '}
                                            {subject.sessions_count === 1 ? 'session' : 'sessions'}
                                        </span>
                                        <span className="text-gray-300">›</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
