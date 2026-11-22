# Home activities

The first commented entry in js/home-activities.js is the annual theme.
Change its year, title, bilingual text and optional image there to switch
to 2027; no renderer edits are needed. The year is formatted in Bengali.
The theme and its frame are static HTML above a slim Sunday-time/address/Visit
line and the full welcome/service-times hero. Phones use a viewport-bounded,
uncropped portrait frame and compact controls so that line stays on the first
screen. Desktop retains its larger slider. The slim line repeats the existing
visit summary's service time and address.
The production build refreshes that HTML from this same configuration, so after
editing the entry run npm run build:production. Deferred scripts enhance the
existing theme nodes and add the flyer slides; no-JavaScript visitors still
see the theme and its Visit link. Ordinary event cards remain below Church Family.

Flyer entries carry Pacific start/end times and a calendar title. Their countdown
updates at Pacific midnight, the start/end boundary, and tab return, using the
same scheduling timer as expiry (never a per-second ticker). Ended events remain
marked Ended until their existing midnight expiry. Calendar downloads are local
Blobs with stable UIDs, escaped text, UTF-8 folding and Los Angeles time-zone
rules. The existing content.json Visit address supplies their location.
The date timeline replaces dots/pills and arrow buttons as the single navigation
control on both breakpoints; swipe and keyboard navigation remain available.
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
