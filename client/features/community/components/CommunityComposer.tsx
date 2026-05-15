import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import communityStyles from "@/styles/community.module.css";
import { FOCUS_VISIBLE, cn, communityUi } from "../design";

export function CommunityComposer({
  draft,
  creating,
  onDraftChange,
  onSubmit,
}: {
  draft: string;
  creating: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section
      className={cn(communityUi.panel, "mt-7 p-[16px] sm:p-[20px]", communityStyles.panelBorder)}
      aria-busy={creating}
    >
      <div className="flex flex-col gap-[14px] sm:flex-row sm:items-start">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#4f63ff] to-[#7c3aed] text-sm font-extrabold text-white">
          YU
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor="community-draft" className="sr-only">
            Share your investment insights
          </label>
          <textarea
            id="community-draft"
            name="community-draft"
            autoComplete="off"
            disabled={creating}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Share your investment insights…"
            rows={4}
            className={cn(
              "min-h-[112px] w-full resize-none px-[16px] py-[14px] text-[15px] leading-6 sm:min-h-[98px]",
              communityUi.field,
              communityStyles.inputBorder,
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          />
        </div>
      </div>

      <div className="mt-[12px] flex flex-wrap items-center justify-between gap-[12px] pl-0 sm:pl-14">
        <button
          type="button"
          className={cn(
            communityUi.iconButton,
            "h-10 w-10 text-[#8f98aa] hover:bg-white/[0.04] hover:text-[#e2e7f2]",
            FOCUS_VISIBLE
          )}
          title="Image attachments are available in replies"
          aria-label="Image attachments are available in replies"
        >
          <ImageOutlinedIcon aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={creating || !draft.trim()}
          className={cn(
            "inline-flex h-9 shrink-0 touch-manipulation items-center gap-2 rounded-lg bg-[#5d67ff] px-[16px] text-sm font-bold text-white transition-colors",
            "hover:bg-[#7079ff]",
            communityUi.disabled,
            FOCUS_VISIBLE
          )}
        >
          <SendRoundedIcon sx={{ fontSize: 17 }} aria-hidden="true" />
          {creating ? "Posting…" : "Post"}
        </button>
      </div>
    </section>
  );
}
