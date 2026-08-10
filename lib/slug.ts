export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export function subjectSlug(subject: { id: number; name: string }, allSubjects: { id: number; name: string }[]): string {
    const base = slugify(subject.name);
    const hasCollision = allSubjects.some(s => s.id !== subject.id && slugify(s.name) === base);
    return hasCollision ? `${base}-${subject.id}` : base;
}

export function resolveSubjectBySlug(slug: string, allSubjects: { id: number; name: string }[]): { id: number; name: string } | undefined {
    // Exact unique match
    const byBase = allSubjects.filter(s => slugify(s.name) === slug);
    if (byBase.length === 1) return byBase[0];

    // Collision format: {base-slug}-{id}
    const match = slug.match(/^(.+)-(\d+)$/);
    if (match) {
        const base = match[1];
        const id = parseInt(match[2]);
        return allSubjects.find(s => s.id === id && slugify(s.name) === base);
    }

    return undefined;
}
