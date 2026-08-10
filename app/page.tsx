import Link from 'next/link';

export default function Home() {
    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <h1 className="text-4xl font-semibold text-gray-900 mb-3">Heirloom</h1>
                <p className="text-gray-500 mb-8">
                    Preserve the stories that matter most.
                </p>
                <Link
                    href="/login"
                    className="inline-block bg-gray-900 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                    Sign in
                </Link>
            </div>
        </main>
    );
}
