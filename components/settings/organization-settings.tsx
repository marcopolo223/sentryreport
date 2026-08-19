"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Replace, X } from "lucide-react";

import { updateOrganizationProfile } from "@/app/actions/org";
import { BannerPlaceholder } from "@/components/org/banner-placeholder";
import { WindowFrame } from "@/components/reports/window-frame";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImageFile } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function OrganizationSettings({
  org,
  isOwner,
  canBrand,
  error,
}: {
  org: Pick<
    Tables<"organizations">,
    | "id"
    | "name"
    | "agency_name"
    | "address"
    | "logo_url"
    | "banner_url"
  >;
  isOwner: boolean;
  canBrand: boolean;
  error?: string;
}) {
  return (
    <div className="min-w-0 space-y-6">
      {error && <Alert>{error}</Alert>}

      <WindowFrame title="Organization">
        <form action={updateOrganizationProfile} className="space-y-4 p-4">
          <div>
            <Label htmlFor="orgName">Organization name</Label>
            <Input
              id="orgName"
              name="orgName"
              required
              defaultValue={org.name}
            />
          </div>
          <div>
            <Label htmlFor="agencyName">Security agency (optional)</Label>
            <Input
              id="agencyName"
              name="agencyName"
              defaultValue={org.agency_name ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              name="address"
              required
              defaultValue={org.address ?? ""}
            />
          </div>
          <Button type="submit">Save details</Button>
        </form>
      </WindowFrame>

      <WindowFrame title="Branding">
        <BrandingStudio
          orgId={org.id}
          orgName={org.name}
          logoUrl={org.logo_url}
          bannerUrl={org.banner_url}
          isOwner={isOwner}
          canBrand={canBrand}
        />
      </WindowFrame>
    </div>
  );
}

function BrandingStudio({
  orgId,
  orgName,
  logoUrl,
  bannerUrl,
  isOwner,
  canBrand,
}: {
  orgId: string;
  orgName: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  isOwner: boolean;
  canBrand: boolean;
}) {
  const [logo, setLogo] = useState(logoUrl);
  const [banner, setBanner] = useState(bannerUrl);
  const [busy, setBusy] = useState<"logo" | "banner" | null>(null);
  const [hover, setHover] = useState<"logo" | "banner" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const editable = isOwner && canBrand;

  async function upload(kind: "logo" | "banner", file: File) {
    if (!editable || busy) return;
    setBusy(kind);
    setMessage(null);
    try {
      const supabase = createClient();
      const compressed = await compressImageFile(
        file,
        kind === "banner" ? 1920 : 800
      );
      const path = `${orgId}/${kind}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("org-branding")
        .upload(path, compressed, {
          contentType: compressed.type || "image/jpeg",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("org-branding").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("organizations")
        .update(
          kind === "logo" ? { logo_url: publicUrl } : { banner_url: publicUrl }
        )
        .eq("id", orgId);
      if (updateError) throw updateError;
      if (kind === "logo") setLogo(publicUrl);
      else setBanner(publicUrl);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not upload.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(kind: "logo" | "banner") {
    if (!editable || busy) return;
    setBusy(kind);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("organizations")
        .update(kind === "logo" ? { logo_url: null } : { banner_url: null })
        .eq("id", orgId);
      if (updateError) throw updateError;
      await supabase.storage.from("org-branding").remove([`${orgId}/${kind}.jpg`]);
      if (kind === "logo") setLogo(null);
      else setBanner(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not remove.");
    } finally {
      setBusy(null);
    }
  }

  function onDrop(kind: "logo" | "banner", event: React.DragEvent) {
    event.preventDefault();
    setHover(null);
    const file = event.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) void upload(kind, file);
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-muted-foreground">
        This is how the property appears on the home page and on PDFs.
      </p>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-muted shadow-soft",
          !editable && "opacity-80"
        )}
      >
        <div
          className={cn(
            "group/banner relative h-40 sm:h-52",
            editable && "cursor-pointer"
          )}
          onDragOver={(event) => {
            if (!editable) return;
            event.preventDefault();
            setHover("banner");
          }}
          onDragLeave={() => setHover(null)}
          onDrop={(event) => onDrop("banner", event)}
          onClick={() => editable && bannerInput.current?.click()}
        >
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <BannerPlaceholder />
          )}
          {editable && (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-foreground/35 text-background opacity-0 transition-opacity duration-200",
                editable && "group-hover/banner:opacity-100",
                (hover === "banner" || busy === "banner") && "opacity-100"
              )}
            >
              <span className="inline-flex items-center gap-2 rounded-md bg-background/90 px-3 py-2 text-sm font-medium text-foreground shadow-soft">
                {busy === "banner" ? (
                  "Uploading…"
                ) : banner ? (
                  <>
                    <Replace className="size-4" />
                    Replace banner
                  </>
                ) : (
                  <>
                    <ImagePlus className="size-4" />
                    Add banner
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-end gap-3 bg-card px-4 pb-4 pt-0">
          <div
            className={cn(
              "group/logo relative -mt-10 size-20 shrink-0 overflow-hidden rounded-xl border-2 border-card bg-card shadow-soft sm:size-24",
              editable && "cursor-pointer"
            )}
            onDragOver={(event) => {
              if (!editable) return;
              event.preventDefault();
              event.stopPropagation();
              setHover("logo");
            }}
            onDragLeave={() => setHover(null)}
            onDrop={(event) => {
              event.stopPropagation();
              onDrop("logo", event);
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (editable) logoInput.current?.click();
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="size-full object-contain bg-card p-1.5"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                <ImagePlus className="size-6" />
              </div>
            )}
            {editable && (
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-foreground/40 text-[10px] font-medium text-background opacity-0 transition-opacity duration-200",
                  editable && "group-hover/logo:opacity-100",
                  (hover === "logo" || busy === "logo") && "opacity-100"
                )}
              >
                {busy === "logo" ? "…" : logo ? "Replace" : "Add"}
              </div>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {orgName}
            </p>
            <p className="text-xs text-muted-foreground">
              Logo sits on the banner, the way it does at home.
            </p>
          </div>
        </div>
      </div>

      <input
        ref={logoInput}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={!editable || Boolean(busy)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload("logo", file);
        }}
      />
      <input
        ref={bannerInput}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={!editable || Boolean(busy)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload("banner", file);
        }}
      />

      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={Boolean(busy)}
            onClick={() => logoInput.current?.click()}
          >
            <ImagePlus />
            {logo ? "Replace logo" : "Upload logo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={Boolean(busy)}
            onClick={() => bannerInput.current?.click()}
          >
            <ImagePlus />
            {banner ? "Replace banner" : "Upload banner"}
          </Button>
          {logo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={Boolean(busy)}
              onClick={() => void remove("logo")}
            >
              <X />
              Remove logo
            </Button>
          )}
          {banner && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={Boolean(busy)}
              onClick={() => void remove("banner")}
            >
              <X />
              Remove banner
            </Button>
          )}
        </div>
      )}

      {message && <p className="text-sm text-destructive">{message}</p>}

      {editable ? (
        <p className="text-xs text-muted-foreground">
          Square logo, wide banner. Drop an image onto either area, or use the
          buttons.
        </p>
      ) : !isOwner ? (
        <p className="text-xs text-muted-foreground">
          Only the owner can change the logo and banner.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Logo and banner on reports and PDFs are included with Standard and
          Pro.{" "}
          <Link href="/admin/billing" className="font-medium text-primary hover:underline">
            View billing
          </Link>
        </p>
      )}
    </div>
  );
}
