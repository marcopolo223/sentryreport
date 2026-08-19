"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Trash2, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  compressImageFile,
  extensionForType,
  readVideoDuration,
} from "@/lib/media";
import type { Tables } from "@/lib/supabase/types";

type MediaRow = Tables<"report_media">;

export function MediaAttach({
  orgId,
  reportId,
  userId,
  videoSeconds,
  readOnly,
  initialItems,
}: {
  orgId: string;
  reportId: string;
  userId: string;
  videoSeconds: number;
  readOnly?: boolean;
  initialItems: MediaRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadPreviews() {
      const next: Record<string, string> = {};
      for (const item of items) {
        const { data } = await supabase.storage
          .from("report-media")
          .createSignedUrl(item.storage_path, 60 * 30);
        if (data?.signedUrl) next[item.id] = data.signedUrl;
      }
      if (!cancelled) setPreviews(next);
    }

    void loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [items]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) {
        throw new Error("Attach a photo or video.");
      }

      let duration: number | null = null;
      let uploadFile = file;
      if (isVideo) {
        duration = await readVideoDuration(file);
        if (duration > videoSeconds) {
          throw new Error(
            `Video must be ${videoSeconds} seconds or shorter on this plan.`
          );
        }
      } else {
        uploadFile = await compressImageFile(file);
      }

      const kind = isVideo ? "video" : "photo";
      const ext = extensionForType(uploadFile.type, kind);
      const path = `${orgId}/${reportId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("report-media")
        .upload(path, uploadFile, { contentType: uploadFile.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from("report_media")
        .insert({
          report_id: reportId,
          organization_id: orgId,
          kind,
          storage_path: path,
          content_type: uploadFile.type,
          byte_size: uploadFile.size,
          duration_seconds: duration,
          created_by: userId,
        })
        .select("*")
        .single();
      if (insertError || !data) throw insertError ?? new Error("Could not save media.");
      setItems((current) => [...current, data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach file.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: MediaRow) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.storage.from("report-media").remove([item.storage_path]);
      const { error: deleteError } = await supabase
        .from("report_media")
        .delete()
        .eq("id", item.id);
      if (deleteError) throw deleteError;
      setItems((current) => current.filter((row) => row.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative overflow-hidden rounded-md border border-border"
          >
            {item.kind === "photo" && previews[item.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previews[item.id]}
                alt=""
                className="h-20 w-20 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center bg-muted text-muted-foreground">
                <Video className="size-5" />
              </div>
            )}
            {!readOnly && (
              <button
                type="button"
                className="absolute right-1 top-1 rounded-md bg-background/90 p-1 text-foreground"
                onClick={() => void remove(item)}
                aria-label="Remove attachment"
                disabled={busy}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void onPick(event)}
          />
          <span>
            <Button type="button" variant="outline" disabled={busy} asChild>
              <span>
                <ImagePlus />
                {busy ? "Uploading…" : "Add photo or video"}
              </span>
            </Button>
          </span>
        </label>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Videos can be up to {videoSeconds} seconds on this plan. Photos are
        compressed before upload.
      </p>
    </div>
  );
}
