"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit2, Trash2, Globe, Calendar, MapPin, Eye, EyeOff } from "lucide-react";
import { Festival } from "@/lib/types";
import { formatDateRange, formatDate } from "@/lib/utils/dates";
import { setFestivalPublished, deleteFestival } from "@/lib/festivals";
import { createClient } from "@/lib/supabase/client";

interface AdminFestivalsListProps {
  initialFestivals: Festival[];
}

export function AdminFestivalsList({ initialFestivals }: AdminFestivalsListProps) {
  const [supabase] = useState(() => createClient());
  const [festivals, setFestivals] = useState<Festival[]>(initialFestivals);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleTogglePublish = async (festival: Festival) => {
    if (togglingId) return;
    setTogglingId(festival.id);
    const nextPublished = !festival.is_published;

    try {
      await setFestivalPublished(supabase, festival.id, nextPublished);
      setFestivals((prev) =>
        prev.map((f) => (f.id === festival.id ? { ...f, is_published: nextPublished } : f))
      );
    } catch (err) {
      console.error("Failed to toggle published state:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    setDeletingId(id);
    try {
      await deleteFestival(supabase, id);
      setFestivals((prev) => prev.filter((f) => f.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Failed to delete festival:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303232] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/admin"
              className="text-xs text-[#878787] hover:text-[#E6E6E6] flex items-center space-x-1"
            >
              <ArrowLeft size={13} />
              <span>Admin</span>
            </Link>
            <span className="text-xs text-[#878787]">•</span>
            <span className="text-xs font-mono text-[#6C86FF]">Festivals</span>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl text-[#E6E6E6] tracking-tight pt-1">
            Manage Festivals
          </h1>
        </div>

        <Link
          href="/admin/festivals/new"
          className="px-4 py-2 bg-[#002EC1] hover:bg-[#1F4BE0] active:bg-[#0021A0] text-[#E6E6E6] text-xs font-semibold rounded-xl flex items-center space-x-1.5 self-start sm:self-auto transition-colors"
        >
          <Plus size={16} strokeWidth={1.5} />
          <span>New</span>
        </Link>
      </div>

      {/* List / Table */}
      {festivals.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#303232] rounded-2xl p-6 space-y-3">
          <p className="text-sm text-[#878787]">No festivals yet.</p>
          <Link
            href="/admin/festivals/new"
            className="inline-block px-4 py-2 text-xs font-semibold bg-[#002EC1] hover:bg-[#1F4BE0] text-[#E6E6E6] rounded-xl"
          >
            Create festival
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {festivals.map((fest) => (
            <div
              key={fest.id}
              className="bg-[#232525] border border-[#303232] rounded-2xl p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-[#A8A8A8]">{fest.organiser}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-full ${
                        fest.is_published
                          ? "bg-[#0B1A4A] text-[#6C86FF]"
                          : "bg-[#2E3030] text-[#878787]"
                      }`}
                    >
                      {fest.is_published ? "Published" : "Unpublished"}
                    </span>
                  </div>

                  <Link
                    href={`/admin/festivals/${fest.id}`}
                    className="font-heading text-lg text-[#E6E6E6] hover:text-[#6C86FF] transition-colors truncate block"
                  >
                    {fest.name}
                  </Link>
                </div>

                {/* Actions: Edit, Publish/Unpublish, Delete */}
                <div className="flex items-center space-x-2 shrink-0 pt-1 sm:pt-0">
                  <Link
                    href={`/admin/festivals/${fest.id}`}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] text-[#E6E6E6] rounded-xl flex items-center space-x-1"
                  >
                    <Edit2 size={13} strokeWidth={1.5} />
                    <span>Edit</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleTogglePublish(fest)}
                    disabled={togglingId === fest.id}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#1C1E1E] hover:bg-[#2E3030] border border-[#303232] text-[#E6E6E6] rounded-xl flex items-center space-x-1 cursor-pointer"
                  >
                    {fest.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{fest.is_published ? "Unpublish" : "Publish"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(fest.id)}
                    disabled={deletingId === fest.id}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center space-x-1 transition-colors cursor-pointer ${
                      confirmDeleteId === fest.id
                        ? "bg-red-950/60 border-red-500/60 text-red-300"
                        : "bg-[#1C1E1E] hover:bg-[#2E3030] border-[#303232] text-red-400"
                    }`}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                    <span>{confirmDeleteId === fest.id ? "Sure?" : "Delete"}</span>
                  </button>
                </div>
              </div>

              {/* Meta details */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#878787] pt-1 border-t border-[#303232]">
                <span className="capitalize">{fest.kind}</span>
                <span>•</span>
                <span className="capitalize">
                  {fest.work_mode === "in_person"
                    ? `In person${fest.city ? ` (${fest.city})` : ""}`
                    : fest.work_mode}
                </span>
                <span>•</span>
                <span>{formatDateRange(fest.starts_on, fest.ends_on)}</span>
                {fest.submit_by && (
                  <>
                    <span>•</span>
                    <span>Submit by {formatDate(fest.submit_by)}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
