import Link from "next/link";
import { AppLayout } from "@/components/shell/AppLayout";

export default function NotFound() {
  return (
    <AppLayout title="Not Found">
      <div className="bg-[#232525] border border-[#303232] p-10 text-center space-y-4 rounded-2xl shadow-lg">
        <h2 className="font-display text-4xl tracking-wide text-[#E6E6E6]">
          404
        </h2>
        <p className="text-sm text-[#A8A8A8]">
          The page or creative work you requested could not be found.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] px-6 py-2.5 text-sm font-semibold transition-all duration-200 rounded-xl shadow-md hover:shadow-lg active:scale-[0.99]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
