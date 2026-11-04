"use client";

import { type FormEvent, useEffect, useState } from "react";
import { getConfirmedUser } from "@/lib/auth";
import { logAppError } from "@/lib/errors";
import type { TranslationKey } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/useLanguage";

const REPORT_REASONS: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: "offensive", labelKey: "reviewReport.reasonOffensive" },
  { value: "spam", labelKey: "reviewReport.reasonSpam" },
  { value: "false", labelKey: "reviewReport.reasonFalse" },
  { value: "other", labelKey: "reviewReport.reasonOther" },
];

const REPORT_COMMENT_MAX_LENGTH = 500;
const UNIQUE_VIOLATION = "23505";

/**
 * The signed-in user who may report reviews, or null. Pages call this once and
 * pass the id to every ReviewReportControl in their list.
 */
export function useReviewReporterId() {
  const [reporterId, setReporterId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getConfirmedUser()
      .then((result) => {
        if (active && result.status === "confirmed") {
          setReporterId(result.user.id);
        }
      })
      .catch(() => {
        // No report link if the session can't be read.
      });

    return () => {
      active = false;
    };
  }, []);

  return reporterId;
}

export function ReviewReportControl({
  reviewId,
  reporterId,
}: {
  reviewId: number;
  reporterId: string | null;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [doneMessage, setDoneMessage] = useState("");

  if (!reporterId) return null;

  if (doneMessage) {
    return (
      <p role="status" className="mt-3 text-sm font-semibold text-mint">
        {doneMessage}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-semibold text-body underline underline-offset-4 transition hover:text-cream"
      >
        {t("reviewReport.link")}
      </button>
    );
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!reason) {
      setError(t("reviewReport.chooseReason"));
      return;
    }

    setSubmitting(true);
    setError("");

    // No .select(): reporters can't read review_reports back (admins only).
    const { error: insertError } = await supabase.from("review_reports").insert({
      review_id: reviewId,
      reporter_id: reporterId,
      reason,
      comment: comment.trim() || null,
    });

    setSubmitting(false);

    if (insertError?.code === UNIQUE_VIOLATION) {
      setDoneMessage(t("reviewReport.alreadyReported"));
      return;
    }

    if (insertError) {
      logAppError("Review report failed", insertError, {
        operation: "report_review",
        reviewId,
      });
      setError(t("reviewReport.failed"));
      return;
    }

    setDoneMessage(t("reviewReport.thanks"));
  }

  return (
    <form onSubmit={submitReport} className="ui-card mt-4 grid gap-4 rounded-2xl p-4">
      <fieldset className="grid gap-2">
        <legend className="font-semibold text-cream">
          {t("reviewReport.title")}
        </legend>
        {REPORT_REASONS.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 items-center gap-3 text-sm font-semibold text-body"
          >
            <input
              type="radio"
              name={`report-reason-${reviewId}`}
              value={option.value}
              checked={reason === option.value}
              onChange={() => setReason(option.value)}
              className="h-4 w-4 shrink-0"
            />
            {t(option.labelKey)}
          </label>
        ))}
      </fieldset>

      <label className="grid gap-2 text-sm font-semibold text-body">
        {t("reviewReport.commentLabel")}
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          maxLength={REPORT_COMMENT_MAX_LENGTH}
          placeholder={t("reviewReport.commentPlaceholder")}
          className="premium-input p-3 font-semibold"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="premium-button min-h-11 px-6 py-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t("reviewReport.sending") : t("reviewReport.send")}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="min-h-11 rounded-full bg-well px-6 py-2 font-semibold text-body transition hover:text-cream disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
