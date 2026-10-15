# Guest photos

Drop square photos here, named after the guest slug in `src/data/guests.ts`.

```
src/assets/guests/christopher-land.jpg
```

Then set `photo: 'christopher-land.jpg'` on that guest. Astro optimizes them at
build time to AVIF at 160px and 320px, so the original can be any size as long
as it is square and at least 320px wide.

A guest with no photo gets a clean initials avatar instead, so nothing breaks
while you wait on an image.

Photos live here rather than in `/public` because only files inside `src` can
go through Astro's image pipeline.
