"use client";

import { useEffect } from "react";
import { AppLayout } from "@/components/shell/AppLayout";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppLayout title="Error">
      <div className="bg-[#232525] border border-[#303232] p-8 text-center space-y-4 rounded-2xl shadow-lg">
        <h2 className="font-display text-2xl tracking-wide text-[#E6E6E6]">
          Something went wrong
        </h2>
        <p className="text-sm text-[#A8A8A8]">
          An unexpected error occurred. Please try again.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] px-6 py-2.5 text-sm font-semibold transition-all duration-200 rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
