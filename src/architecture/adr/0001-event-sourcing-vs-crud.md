# ADR 0001: Event Sourcing vs CRUD in AIP v3

## Status
Proposed

## Context
In building a highly personalized, offline-first dashboard (MANI OS), we need to track user behavior patterns, habit transitions, and state histories over long periods (2–3 years). The traditional Create, Read, Update, Delete (CRUD) approach overwrites state, which discards historical transaction intervals, timing variations, and offline editing contexts. We need a system that supports deterministic audits, offline transaction queues, multi-device sync, and flexible analytical replays without data loss.

## Decision
We will use **Event Sourcing** as the core data capture pattern. All state changes are modeled as immutable facts (Events) appended to a chronological store. 

Key details:
- State mutations are represented by structured domain events conforming to versioned schemas (e.g. `water.logged.v1`).
- The in-memory application state is computed by replaying events through projection engines.
- CRUD operations are replaced by command dispatchers and aggregates.

## Consequences
- **Pros**:
  - Full audit trail of user activities, allowing precise habit mining.
  - Trivial crash recovery and time-travel debugging.
  - Native offline-first queues (append events locally and upload asynchronously).
  - Out-of-order event conflict resolution is handled deterministically via timestamp logs.
- **Cons**:
  - Higher memory usage for full event replays (mitigated by introducing a Snapshotting Engine).
  - Schema evolutions require explicit v1 ➔ v2 ➔ v3 upcasters.
