# VectorVault — Architecture & Design Decisions

## [2026-07-08] Similarity Clipping in Cosine Distance
- **Decision**: Clip similarity to the range `[-1.0, 1.0]` in `cosine_distance` before computing distance.
- **Reasoning**: Floating-point precision issues in computer arithmetic can occasionally produce cosine similarities slightly outside the theoretical range of `[-1.0, 1.0]` (e.g. `1.0000001` or `-1.0000001`). This leads to distances outside `[0.0, 2.0]`. Adding defensive clipping ensures correct and safe distance bounds.
