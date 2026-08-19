import { RegenJoinCodeButton } from "@/components/regen-join-code-button";
import { CopyJoinCodeButton } from "@/components/copy-join-code-button";
import { WindowFrame } from "@/components/reports/window-frame";

export function JoinCodePanel({
  joinCode,
  isOwner,
}: {
  joinCode: string;
  isOwner: boolean;
}) {
  return (
    <WindowFrame title="Join code">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-2xl tracking-[0.2em] text-foreground">
          {joinCode}
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyJoinCodeButton joinCode={joinCode} />
          {isOwner && <RegenJoinCodeButton />}
        </div>
      </div>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Share this {joinCode.length}-character code with officers. Regenerating
        creates a new 8-character code and stops the current one from working
        for future joins; pending requests stay.
      </p>
    </WindowFrame>
  );
}
