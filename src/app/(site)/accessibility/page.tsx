import type { Metadata } from "next";
import { site } from "@/content/site";
import { LegalPage } from "@/components/ui/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Accessibility", description: `Accessibility at ${site.shortName}.`, path: "/accessibility" });

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility" updated="November 7, 2026">
      <p>
        We want everyone to be able to browse the work, understand pricing and get in touch easily. This site aims to meet the Web
        Content Accessibility Guidelines (WCAG) 2.2 at level AA.
      </p>
      <h2>What we&apos;ve done</h2>
      <ul>
        <li>Keyboard navigation throughout, with visible focus and a skip-to-content link.</li>
        <li>Descriptive alternative text for photographs and a keyboard-accessible photo viewer.</li>
        <li>Text and controls designed for strong color contrast and large touch targets.</li>
        <li>Forms with clear labels, announced errors and no time limits.</li>
        <li>Reduced motion respected: if your device asks for less motion, animations are minimized.</li>
        <li>
          Flick, the little site helper, is optional. It never blocks content, pauses while you type, and can be hidden at any time
          from its menu or the site footer.
        </li>
      </ul>
      <h2>Sessions</h2>
      <p>
        If you or someone in your session has mobility, sensory or other access needs, tell us when you inquire. We&apos;ll plan the
        location, pace and setup around them.
      </p>
      <h2>Feedback</h2>
      <p>
        If something on this site doesn&apos;t work for you, please <a href="/contact">let us know</a> and we&apos;ll do our best to fix it
        or help another way.
      </p>
    </LegalPage>
  );
}
