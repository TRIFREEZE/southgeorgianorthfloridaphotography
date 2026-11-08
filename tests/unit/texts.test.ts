import { describe, expect, it } from "vitest";
import { blocksToText, journalPosts, textToBlocks } from "@/content/journal";
import { services } from "@/content/services";
import { editedPost, editedServices, editedStory, makeT, TEXT_FIELDS, textOf, withTexts } from "@/lib/cms/texts";

describe("editable text", () => {
  it("has unique keys and a default for every field", () => {
    const keys = TEXT_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const f of TEXT_FIELDS) if (!["about.name", "about.name2"].includes(f.key)) expect(f.default.length, f.key).toBeGreaterThan(0);
    expect(TEXT_FIELDS.length).toBeGreaterThan(200);
  });

  it("falls back to the original copy and fills placeholders", () => {
    expect(textOf({}, "about.foundersTitle")).toBe("Meet the founders");
    expect(textOf({ "about.foundersTitle": "  " }, "about.foundersTitle")).toBe("Meet the founders");
    expect(textOf({}, "home.hero.price", { price: "$150" })).toBe("Portrait sessions from $150.");
    const t = makeT({ "about.story": "One.\n\nTwo." });
    expect(t.paras("about.story")).toEqual(["One.", "Two."]);
  });

  it("applies overrides to structured content, including service names and lists", () => {
    const slug = services[0].slug;
    const edited = editedServices({ [`services.${slug}.name`]: "Family Portraits", [`services.${slug}.idealFor`]: "A\n\nB ", [`services.${slug}.steps.2.title`]: "Plan it" });
    expect(edited[0].name).toBe("Family Portraits");
    expect(edited[0].idealFor).toEqual(["A", "B"]);
    expect(edited[0].howItWorks[1].title).toBe("Plan it");
    expect(edited[0].slug).toBe(slug);
    expect(edited[1].name).toBe(services[1].name);
    // service wording is now edited with each category, so it's no longer in the Page text list
    const keys = new Set(TEXT_FIELDS.map((f) => f.key));
    expect(keys.has(`services.${slug}.name`)).toBe(false);
  });

  it("keeps ids untouched when editing the story builder", () => {
    const s = editedStory({ "story.subjects.1.label": "Our crew" });
    expect(s.subjects[0]).toMatchObject({ id: "family", label: "Our crew" });
    expect(withTexts({ id: "x", title: "a" }, "p", { "p.id": "nope", "p.title": "b" })).toEqual({ id: "x", title: "b" });
  });

  it("round-trips journal articles through the plain-text format", () => {
    for (const p of journalPosts) expect(textToBlocks(blocksToText(p.body))).toEqual(p.body);
    const post = editedPost({ [`journal.${journalPosts[0].slug}.body`]: "## Hi\nFirst line\nsame para\n\n- a\n- b\n> note" }, journalPosts[0]);
    expect(post.body).toEqual([
      { type: "h2", text: "Hi" },
      { type: "p", text: "First line same para" },
      { type: "ul", items: ["a", "b"] },
      { type: "note", text: "note" },
    ]);
  });
});
