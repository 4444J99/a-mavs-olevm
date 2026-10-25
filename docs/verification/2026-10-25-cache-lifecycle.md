# Cache lifecycle reconciliation

Owner: original PR 182 / issue 181 and ACE issue 12.
Based on runtime/dependency successor 91bfda8; no prior submitted head changed.

The root worker now enforces thumbnail/waveform/metadata limits (100/50/50 by
default). Successful writes and explicit configuration changes expire old entries
and evict oldest excess entries in the same owned store. Zero capacity retains
network delivery. Negative, fractional and non-finite entry limits are ignored.
Ordinary offline reads retain stale fallback; shell and unrelated stores are not
part of this maintenance. No original media or native provider state is deleted.

Nine regressions failed before repair: eight for the missing bounds/expiry and
one deterministic concurrent expiry-scan/refresh race. Per-store non-audio write
and maintenance serialization fixes the race. Network responses are cloned before
queueing, so foreground consumption remains independent of background work.
Audio retains its existing independent byte-bound write path.

Fresh pinned Node 24.19.0 validation: all 49 production-worker unit cases passed,
including stream delivery, historical fallback, routing, ranges, invalid/zero
limits, cache ownership and refresh concurrency. Six native lifecycle/management
cases passed across Chromium, Firefox and Mobile Chrome in 5.9 seconds. These
serve the actual worker over HTTP, hold its source stream open until foreground
bytes arrive, then observe the completed CacheStorage entry. Entry tests poll
actual storage rather than assume a delay. Formatting and whitespace passed.

Recovered PR 182's missing plan, dated verification and original offline-media
suite. Historical prose has explicit source-head/date provenance. The native
suite retains original media bytes, worker update/retirement, cache sentinels,
offline ranges, decoder playback/seek, fragments, fallback and catalogue checks.
Timing/routing expectations now observe the asynchronous audio cache commit
and expect application images to remain network-first. The fixture closes its
actual HTTP origin before offline checks: Firefox still reached that origin
despite browser offline emulation (initial cross-project run: four passed,
two Firefox navigation-fallback failures with real server 404 responses).
After that fixture correction, all six original offline-media cases passed
across Chromium, Firefox and Mobile Chrome in 20.4 seconds, at root and subpath
deployment bases. These include the original recording's decoder playback and
offline seeking with an actually unavailable HTTP origin.

Independent review reproduced the refresh race, then found no remaining Important
blockers after repair. This is source/local-browser evidence; hosted rollout,
live CDN configuration, Safari/iPhone and artistic/device acceptance remain open.
Original carriers remain retained pending verified default integration.

## Follow-up review: historical application assets

PR189 review PRRT_kwDONx_cBs6wEKcj was accepted after three regressions reproduced
503 responses for images, application JSON and waveform-named application JSON
present only in their former owned v1 media stores. On network failure the worker
now prefers the current application cache, then the exact former owned media
store, then the navigation fallback. Live application resources remain
network-first and unrelated stores remain inaccessible. All54 worker cases pass,
including the reviewed application-copy priority case.
The original native offline suite seeds the actual fragments JSON in the old
metadata store and verifies its bytes after the HTTP origin is shut down. All12
offline/streaming/management cases pass across the three browser projects in
18.2 seconds. An initial fixture-argument binding error was corrected before
this passing run; no failing assertion was removed.

The user also identified repeated normal-browser tab launches. BrowserSync's
installed default is open: local / browser: default; Playwright previously used
the manual dev command without overriding it. Automated test startup now passes
--no-open. The manual development command is preserved. One scoped headless
probe passed with the new configuration, and its port3000 server exited.

## Follow-up review: pending response memory

Accepted PRRT_kwDONx_cBs6wFA4h: serialized writes previously retained unread
response clones while earlier writes drained. Admission now precedes cloning,
with default limits of four pending non-audio writes and 16 MiB retained payload
across stores. Copies are consumed immediately with an aggregate byte check
before entering the serialized maintenance queue. Declared oversize bodies are
rejected before cloning; unknown oversized bodies cancel only the cache reader
without awaiting foreground consumption. Every completion/error releases its
count and payload reservation. Bounded concatenation and Response construction
can temporarily copy the payload; the 16 MiB value bounds retained source bytes,
not total browser heap. Network delivery remains independent of cache completion.

Four new regressions cover blocked writers, oversize admission, recovery of
capacity and reversed completion of same-URL bodies. Queue positions are reserved
before copying completes, preserving response arrival order; copies drain eagerly
within the count/byte limits. All 58 worker cases pass. The ordering regression
also rejects an in-memory mutant that queues after body completion. Independent
review found no remaining blocking findings. All 12 native offline/streaming/
management cases pass across Chromium, Firefox and Mobile Chrome in 19.3 seconds
after the ordering correction. No source or original carrier is retired.
