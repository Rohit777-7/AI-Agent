import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo-mark.png";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Overview", to: "/" },
      { label: "Assistant Builder", to: "/builder" },
      { label: "Plans & Billing", to: "/billing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Install guide", to: "/builder" },
      { label: "Get a Gemini API key", href: "https://aistudio.google.com/app/apikey" },
    ],
  },
];

function Footer() {
  return (
    <footer className="relative mt-8 border-t border-gold-200/70 bg-gradient-to-b from-transparent to-gold-50/70">
      <div className="absolute inset-x-0 top-0 gold-rule" />

      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img src={logo} alt="" className="w-9 h-9 rounded-full shadow-[0_0_24px_-6px_rgba(176,141,87,0.6)]" />
              <span className="font-display text-2xl text-stone-950">
                Shifra <span className="italic text-gradient">AI</span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-stone-600">
              Elegant voice assistants that talk to your visitors, answer their
              questions and guide them around your website.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-700">
                {column.title}
              </p>

              <ul className="mt-5 space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-600 hover:text-stone-950 transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.to}
                        className="text-stone-600 hover:text-stone-950 transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-gold-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} ShifraAI. All rights reserved.</p>
          <p className="tracking-[0.14em] uppercase">Crafted for voice-first websites</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
