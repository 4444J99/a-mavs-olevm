# Visual-home CI media prerequisite

Owner: ACE issue 12 and post-merge public-source run 40245774050 at
bae5c6d7e4d36cea8bebeb47996a4c2b3efc58e7. The 38 original carriers are resolved;
this follow-up repairs the real FFmpeg deadline fixture's missing CI prerequisite.

Both source-check and public-exhibit-packaging jobs execute the complete
publication suite but do not install FFmpeg. Preserve every real fixture and
every capability. Install FFmpeg explicitly in both owning jobs before testing.
Validate workflow structure and the implicated 36-case publication suite, publish
through a new exact-head PR, and submit once without waiting or polling CI.
Retain the 209 preexisting image edits byte-for-byte and outside the index.
