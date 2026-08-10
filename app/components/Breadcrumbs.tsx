import Link from 'next/link';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
    return (
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
            {items.map((item, index) => (
                <span key={index} className="flex items-center gap-1.5">
                    {index > 0 && <span>/</span>}
                    {item.href ? (
                        <Link href={item.href} className="hover:text-gray-700 transition-colors">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-700">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
