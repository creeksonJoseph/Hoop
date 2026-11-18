import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f8] px-4 py-12 text-[#191918] selection:bg-[#e6f3fe] selection:text-[#0075de]">
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-[#191918] text-xl font-bold text-white shadow-sm">
          H
        </span>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#0075de]">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          This page went off the grid
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#615d59]">
          The link may be broken, or the page may have moved. Head back to the
          homepage and keep the conversation going.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="rounded-full bg-[#191918] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2b2a28]"
          >
            Back to Hooop
          </Link>
          <Link
            to="/privacy"
            className="rounded-full border border-[#dfdcd9] bg-white px-6 py-2.5 text-sm font-semibold text-[#191918] transition-colors hover:bg-[#f0eeec]"
          >
            Privacy policy
          </Link>
        </div>
      </main>
    </div>
  );
}
