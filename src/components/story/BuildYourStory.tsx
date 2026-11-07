"use client";

import { useMemo, useState } from "react";
import { site } from "@/content/site";
import { composeStory, storyFeelings, storySeasons, storySubjects } from "@/content/story";
import type { Photo } from "@/lib/photo-types";
import { track } from "@/lib/analytics";
import { emitFlick } from "@/components/flick/bus";
import { PhotoFill } from "@/components/media/Photo";
import { StoryCard, storyShareQuery } from "./StoryCard";

/**
 * Optional 30-second "Build Your Story" experience. Never gates booking:
 * the regular booking links stay one click away throughout.
 */
export function BuildYourStory({ photos, headingId }: { photos: Photo[]; headingId: string }) {
  const [subject, setSubject] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [town, setTown] = useState<string>("");
  const [season, setSeason] = useState<string>("");
  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const subj = storySubjects.find((s) => s.id === subject);
  const pool = useMemo(() => photos.filter((p) => !subj || p.category === subj.category).slice(0, 8), [photos, subj]);
  const story = composeStory({ subject, feeling, town: town || null, season: season || null });
  const mood = picked.length ? pool.filter((p) => picked.includes(p.id)) : pool.slice(0, 4);

  const finish = () => {
    if (!story) return;
    setDone(true);
    track("story_complete", { subject: story.subject.id, feeling: story.feeling.id });
    emitFlick({ type: "story-complete" });
  };

  const copy = async () => {
    if (!story) return;
    const url = `${window.location.origin}/story?${storyShareQuery(story)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="eyebrow mb-4">Build your story · optional</p>
        <h2 id={headingId} className="text-display-md">
          Picture it first.
        </h2>
        <p className="mt-5 text-ink-soft">
          Four quick choices and we&apos;ll sketch your session: the feel, a suggested package with honest pricing, travel, and one
          prep tip. Takes about 30 seconds. Or skip it and{" "}
          <a href="/book" className="font-semibold text-clay-deep underline">
            just ask a human
          </a>
          .
        </p>
      </div>

      <div className="lg:col-span-7">
        {done && story ? (
          <div aria-live="polite">
            <StoryCard
              story={story}
              photos={mood}
              actions={
                <>
                  <button type="button" onClick={copy} className="inline-flex min-h-12 items-center rounded-full border border-ink/25 px-5 font-semibold hover:border-ink">
                    {copied ? "Link copied" : "Copy share link"}
                  </button>
                  <button type="button" onClick={() => setDone(false)} className="min-h-12 px-3 text-sm font-semibold underline">
                    Change answers
                  </button>
                </>
              }
            />
            <p className="mt-3 text-xs text-muted">The share link only contains your choices (no personal details).</p>
          </div>
        ) : (
          <div className="space-y-8 rounded-[1.4rem] border border-line bg-gallery p-6 sm:p-8">
            <fieldset>
              <legend className="font-display text-[1.35rem]">1. Who or what do you love?</legend>
              <div className="mt-4 flex flex-wrap gap-2">
                {storySubjects.map((s) => (
                  <Chip
                    key={s.id}
                    name="bys-subject"
                    checked={subject === s.id}
                    onChange={() => {
                      setSubject(s.id);
                      setPicked([]);
                    }}
                    label={s.label}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="font-display text-[1.35rem]">2. What should it feel like?</legend>
              <div className="mt-4 flex flex-wrap gap-2">
                {storyFeelings.map((f) => (
                  <Chip key={f.id} name="bys-feeling" checked={feeling === f.id} onChange={() => setFeeling(f.id)} label={f.label} />
                ))}
              </div>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-4 font-display text-[1.35rem]">3. Roughly where and when?</legend>
              <label className="block text-sm font-semibold">
                Area
                <select className="field mt-1.5" value={town} onChange={(e) => setTown(e.target.value)}>
                  <option value="">Somewhere else / not sure</option>
                  {site.serviceArea.towns.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}, {t.state}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Timing
                <select className="field mt-1.5" value={season} onChange={(e) => setSeason(e.target.value)}>
                  <option value="">Any time</option>
                  {storySeasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            {subject && pool.length > 0 && (
              <fieldset>
                <legend className="font-display text-[1.35rem]">
                  4. Any photos that inspire you? <span className="text-base text-muted">(optional, up to 4)</span>
                </legend>
                <ul className="mt-4 grid grid-cols-4 gap-2">
                  {pool.map((p) => {
                    const on = picked.includes(p.id);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={`${on ? "Remove" : "Add"} inspiration: ${p.title}`}
                          disabled={!on && picked.length >= 4}
                          onClick={() => {
                            setPicked((x) => (on ? x.filter((i) => i !== p.id) : [...x, p.id]));
                            if (!on) emitFlick({ type: "card-pick" });
                          }}
                          className={`relative block aspect-square w-full overflow-hidden rounded-lg ring-offset-2 transition disabled:opacity-40 ${on ? "ring-2 ring-clay-deep" : ""}`}
                        >
                          <PhotoFill photo={p} sizes="120px" showSampleLabel={false} />
                          {on && <span className="absolute right-1 top-1 z-[3] rounded-full bg-ink px-1.5 text-xs text-gallery">✓</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={finish}
                disabled={!story}
                className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-semibold text-gallery hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                Show my session story
              </button>
              {!story && <p className="text-sm text-muted">Pick a subject and a feeling to continue.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[0.95rem] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-clay-deep ${
        checked ? "border-ink bg-ink text-gallery" : "border-ink/20 bg-parchment hover:border-ink/50"
      }`}
    >
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
