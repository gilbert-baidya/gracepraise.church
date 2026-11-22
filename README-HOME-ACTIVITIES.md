# Home activities

The first commented entry in js/home-activities.js is the annual theme.
Change its year, title, bilingual text and optional image there to switch
to 2027; no renderer edits are needed. The year is formatted in Bengali.
Optional showUntil: '2026-12-31' expires the entry after that date's last minute
in America/Los_Angeles. Null has no expiry.

No approved 2026 theme verse/subtitle was found in the repository. For now:
“Rooted in Christ” and “2026 Church Theme” / “২০২৬ মণ্ডলীর থিম”.
A verse/subtitle still needs church approval.

Dated flyer entries follow the theme. Add activities as entries with a unique
slug, date, label, English/Bengali full-information alternatives and optional
imageBase (without -phone/-desktop extensions). They use WebP/PNG pictures and
expire at Pacific midnight after their event date.

One remaining slide has no navigation or autoplay; zero removes the carousel.
Ordinary existing upcoming-event detail cards remain below the carousel.
Playback is 6.5 seconds. Explicit Pause survives expiry rebuilds.
Hover, focus, hidden tabs and reduced motion stop rotation. Reduced motion
also removes transitions. Styling is isolated in assets/css/event-flyers.css.
