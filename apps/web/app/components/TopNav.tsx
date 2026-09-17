import Link from "next/link";

const links = [
  { href: "/home", label: "Home" },
  { href: "/pay", label: "Payments" },
  { href: "/agents", label: "Agents" },
  { href: "/operator", label: "Operator" },
];

export function TopNav({ cta = true }: { cta?: boolean }) {
  return (
    <header className="flex items-center justify-between border-b border-white/5 px-8 py-5">
      <div className="flex items-center gap-10">
        <Link href="/" className="text-sm font-medium tracking-[0.2em] text-paper">
          MOVA
        </Link>
        <nav className="hidden gap-8 text-sm text-mist md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-paper">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      {cta ? (
        <Link
          href="/pay"
          className="rounded-sm bg-paper px-4 py-2 text-xs font-medium tracking-wide text-ink transition-colors hover:bg-white"
        >
          Create payment
        </Link>
      ) : null}
    </header>
  );
}
