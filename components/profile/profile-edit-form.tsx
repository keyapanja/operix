"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile } from "@/lib/profile/actions";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export function ProfileEditForm({
  initial,
  displayName,
}: {
  initial: { nickname: string; avatarUrl: string; bio: string };
  displayName: string;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initial.nickname);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [bio, setBio] = useState(initial.bio);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    setErr(null);
    start(async () => {
      const res = await updateMyProfile({ nickname, avatarUrl, bio });
      if (res.error) setErr(res.error);
      else {
        setMsg("Profile saved.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={nickname || displayName} src={avatarUrl || null} size="lg" />
        <div className="flex-1">
          <Field label="Profile picture URL" htmlFor="pf-avatar" hint="Paste an image link — uploads come in a later phase">
            <Input id="pf-avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…/photo.jpg" />
          </Field>
        </div>
      </div>

      <Field label="Nickname" htmlFor="pf-nick" hint="Shown across the app in place of your full name">
        <Input id="pf-nick" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Sam" />
      </Field>

      <Field label="About" htmlFor="pf-bio">
        <Textarea id="pf-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio…" className="min-h-20" />
      </Field>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {msg && <span className="text-sm text-green-600 dark:text-green-400">{msg}</span>}
        {err && <span className="text-sm text-red-600 dark:text-red-400">{err}</span>}
      </div>
    </div>
  );
}
