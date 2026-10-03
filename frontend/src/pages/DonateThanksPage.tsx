import { Link } from "react-router-dom";
import { Layout } from "../components";

export function DonateThanksPage() {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col bg-deep font-sans text-white">
        <main className="flex-1 flex items-center justify-center p-6 mt-16 text-center">
        <div className="w-full max-w-lg bg-white/5 border border-ice/20 p-10 rounded-3xl shadow-xl backdrop-blur-sm animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-ice/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-ice" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-serif text-ice mb-4">Thank You!</h1>
          <p className="text-white/80 mb-8 text-lg">
            Your generous donation has been received. May God richly bless you for supporting IYC 2026.
          </p>
          
          <Link
            to="/"
            className="inline-block px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all font-semibold"
          >
            Return to Home
          </Link>
        </div>
        </main>
      </div>
    </Layout>
  );
}
