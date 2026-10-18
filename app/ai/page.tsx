import { AppLayout } from "@/components/shell/AppLayout";

export default function AiPage() {
  return (
    <AppLayout title="AI Feedback">
      <div className="bg-[#232525] border border-[#303232] p-7 space-y-3 rounded-2xl shadow-lg">
        <h2 className="font-heading text-2xl sm:text-3xl tracking-tight text-[#E6E6E6]">
          AI Script & Story Feedback
        </h2>
        <p className="text-sm text-[#A8A8A8] leading-relaxed">
          Objective narrative analysis, pacing critique, and character arc feedback powered by dual-provider AI. Arriving in Milestone 3.
        </p>
      </div>
    </AppLayout>
  );
}
