'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { slugify } from '@/lib/slug';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function NewSubjectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        birth_year: '',
        places_lived: '',
        education_profession: '',
        family_structure: '',
        life_chapters: '',
        interests: '',
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const subject = await apiFetch('/heirloom/v1/subjects', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    birth_year: form.birth_year ? parseInt(form.birth_year) : null,
                }),
            });

            router.push(`/subjects/${slugify(subject.name)}`);
        } catch (err) {
            setError('Failed to create subject. Please try again.');
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
                    { label: 'New person' },
                ]} />

                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900">Add a person</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        The more you tell us, the better our questions will be.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Full name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Dorothy Ferreira"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                    </div>

                    {/* Birth year */}
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Year of birth
                        </label>
                        <input
                            type="number"
                            name="birth_year"
                            value={form.birth_year}
                            onChange={handleChange}
                            placeholder="e.g. 1941"
                            min="1900"
                            max={new Date().getFullYear()}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                    </div>

                    {/* Places lived */}
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Places lived
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Where did they grow up? Where have they lived since?
                        </p>
                        <textarea
                            name="places_lived"
                            value={form.places_lived}
                            onChange={handleChange}
                            rows={2}
                            placeholder="e.g. Kingston, Jamaica; Wolverhampton, England from 1959"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Education & profession */}
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Education & profession
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            What did they do for work? Any significant education?
                        </p>
                        <textarea
                            name="education_profession"
                            value={form.education_profession}
                            onChange={handleChange}
                            rows={2}
                            placeholder="e.g. Worked in textile factories, then Royal Mail for 27 years"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Family structure */}
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Family
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Spouse, children, siblings — whoever matters most to their story.
                        </p>
                        <textarea
                            name="family_structure"
                            value={form.family_structure}
                            onChange={handleChange}
                            rows={2}
                            placeholder="e.g. Married to Dermot 1967, three children, eight grandchildren"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Life chapters */}
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Key life chapters
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            Major events, turning points, things you already know about their life.
                        </p>
                        <textarea
                            name="life_chapters"
                            value={form.life_chapters}
                            onChange={handleChange}
                            rows={3}
                            placeholder="e.g. Emigrated from Jamaica in 1959, raised three children largely alone, retired from Royal Mail in 2001"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Interests */}
                    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Interests & personality
                        </label>
                        <p className="text-xs text-gray-400 mb-2">
                            What do they love? What defines them? What makes them laugh?
                        </p>
                        <textarea
                            name="interests"
                            value={form.interests}
                            onChange={handleChange}
                            rows={2}
                            placeholder="e.g. Devoted churchgoer, stubborn, warm, loves to cook"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard')}
                            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-gray-900 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Save person'}
                        </button>
                    </div>

                </form>
            </div>
        </main>
    );
}