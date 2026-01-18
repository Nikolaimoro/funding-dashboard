"use client";

export default function AppFooter() {
  return (
    <footer className="mt-12 border-t border-[#343a4e] py-6 flex items-center justify-end">
      <a
        href="https://x.com/bendbasis"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-current"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.504 11.24h-6.662l-5.213-6.818-5.967 6.818H1.68l7.73-8.844L1.25 2.25h6.83l4.713 6.231L18.244 2.25zm-1.161 17.52h1.833L7.08 4.126H5.114l11.97 15.644z" />
        </svg>
      </a>
    </footer>
  );
}
