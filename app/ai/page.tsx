import { AppLayout } from "@/components/shell/AppLayout";

export default function AiPage() {
  return (
    <AppLayout title="AI Feedback">
      <div className="bg-[#232525] border border-[#303232] p-6 space-y-3 rounded-none">
        <h2 className="font-display text-2xl tracking-wide text-[#E6E6E6]">
          AI Feedback
        </h2>
        <p className="text-sm text-[#A8A8A8]">
          Coming in the next milestone.
        </p>
      </div>
    </AppLayout>
  );
}
