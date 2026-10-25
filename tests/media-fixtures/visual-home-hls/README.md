# Visual home HLS fixture

One second of generated blue, 640 by 360 pixels at 24 frames per second, without
audio or personal media. Created with FFmpeg's color source and the shipped
`scripts/ingest-media.mjs --category Video` pipeline on 2026-10-25.
The three files retain that pipeline's exact HLS master, variant and segment.
The native gallery test serves them through request fixtures and observes actual
decoder playback. Tests and these media fixtures are excluded from publication.

The generated input's SHA-256 was
`19239d8a6d1bfcc99be2d10986fcce8d23b22ed4f720d9e1771fb1a8af2e9ba6`;
the ingest preserved those bytes and produced a valid poster separately.
