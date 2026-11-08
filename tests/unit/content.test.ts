import { describe, expect, it } from "vitest";
import { faqs } from "@/content/faqs";
import { publishedLocations } from "@/content/locations";
import { defaultContent } from "@/lib/cms/defaults";

const pricing = defaultContent().pricing;
import { reviews } from "@/content/reviews";
import { samplePhotos } from "@/content/sample-photos";
import { composeStory } from "@/content/story";
import { buildGuide, searchGuide as search } from "@/components/flick/guide";

const guide = buildGuide({ pricing, faqs });
const searchGuide = (q: string) => search(guide, q);
import { pickLine, contextFor } from "@/components/flick/lines";

describe("truthful content guards", () => {
  it("never ships comparative pricing claims", () => {
    const text = JSON.stringify({ pricing, faqs });
    expect(text).not.toMatch(/half of what|2x cheaper|cheaper than|50% off/i);
    expect(text).not.toMatch(/most popular/i);
  });

  it("doesn't publish city pages without real local content", () => {
    for (const l of publishedLocations()) expect(l.intro.length).toBeGreaterThan(80);
  });

  it("only uses consented reviews", () => {
    for (const r of reviews) expect(r.consentConfirmed).toBe(true);
  });

  it("labels every placeholder photo as a sample with no src", () => {
    for (const p of samplePhotos) {
      expect(p.isSample).toBe(true);
      expect(p.src).toBeNull();
      expect(p.alt).toMatch(/sample placeholder/i);
    }
  });
});

describe("Build Your Story", () => {
  it("recommends custom quotes for weddings and businesses", () => {
    expect(composeStory({ subject: "wedding", feeling: "candid" })!.subject.pkg).toBeNull();
    expect(composeStory({ subject: "business", feeling: "editorial" })!.subject.pkg).toBeNull();
    expect(composeStory({ subject: "family", feeling: "golden" })!.subject.pkg).toBe("full");
  });
  it("requires subject and feeling", () => {
    expect(composeStory({ subject: "family" })).toBeNull();
    expect(composeStory({ subject: "nope", feeling: "candid" })).toBeNull();
  });
});

describe("Ask Flick guide", () => {
  it("answers pricing questions from config", () => {
    const a = searchGuide("how much does it cost?")!;
    expect(a.id).toBe("cost");
    for (const p of pricing.packages) expect(a.answer).toContain(String(p.photos));
  });
  it("finds horses, weddings and service area", () => {
    expect(searchGuide("can i bring my horse")?.id).toBe("horse");
    expect(searchGuide("do you shoot weddings")?.id).toBe("weddings");
    expect(searchGuide("do you travel to Valdosta")?.id).toBe("where");
  });
  it("admits when it doesn't know instead of guessing", () => {
    expect(searchGuide("zzzz qqqq")).toBeNull();
  });
});

describe("Flick lines", () => {
  it("avoids repeats until a pool is exhausted", () => {
    const pool = ["a", "b"];
    const shown = new Set(["a"]);
    expect(pickLine(pool, shown)).toBe("b");
    shown.add("b");
    expect(["a", "b"]).toContain(pickLine(pool, shown));
  });
  it("maps routes to contexts", () => {
    expect(contextFor("/services/pets-horses")).toBe("animals");
    expect(contextFor("/pricing")).toBe("pricing");
    expect(contextFor("/")).toBe("general");
  });
});
