import Link from "next/link";
import { BrainCircuit, LibraryBig, TrendingUp } from "lucide-react";

const TABS = [
  { href: "/",       label: "My Portfolio",    key: "portfolio" },
  { href: "/gurus",  label: "Guru Portfolios", key: "gurus"     },
  { href: "/fallen", label: "Fallen Angels",   key: "fallen"    },
  { href: "/rising", label: "Rising Angels",   key: "rising"    },
  { href: "/research", label: "Investment OS", key: "research", icon: BrainCircuit },
  { href: "/industries", label: "Industry Research", key: "industries", icon: LibraryBig },
];

interface Props {
  active: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export default function NavShell({ active, children, rightSlot }: Props) {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-0 flex items-center justify-between shrink-0 h-12">
        <div className="flex items-center gap-3">
          <TrendingUp size={18} className="text-blue-400" />
          <span className="text-sm font-bold text-white">Research Portfolio</span>
        </div>
        <nav className="flex items-center gap-0.5">
          {TABS.map((t) => (
            <Link key={t.key} href={t.href}
              className={`px-3.5 py-2 text-xs font-medium transition-colors border-b-2 ${
                active === t.key
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
              }`}>
              <span className="flex items-center gap-1.5">
                {t.icon ? <t.icon size={13} /> : null}
                {t.label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 min-w-[200px] justify-end">
          {rightSlot}
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
