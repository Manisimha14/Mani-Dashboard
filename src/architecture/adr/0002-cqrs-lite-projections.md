# ADR 0002: CQRS Lite Projections in AIP v3

## Status
Proposed

## Context
Replaying the entire event history on every render loop would degrade initial render times, violating the Time to Interactive (TTI) target of <1.5s. We need optimized read models tailored to presentation layer widgets (Dashboard widget, Analytics graphs) that separate read operations from command execution write logic.

## Decision
We will implement a **CQRS (Command Query Responsibility Segregation) Lite** architecture. 

Key details:
- Commands represent user intent, validated by domain aggregates, emitting events to the event store.
- An asynchronous **Projection Registry** subscribes to new events, computing specific read-only state projections (DashboardState, HealthState, AnalyticsState).
- UI views query these projections directly through a dedicated **Query Layer**, bypassing direct database reads.

## Consequences
- **Pros**:
  - Extremely fast render speeds (<100ms dashboard updates).
  - Simpler UI component state models.
  - Decoupled read schemas allow modifications to metrics without affecting historical event models.
- **Cons**:
  - Eventual consistency during async event cycles.
  - Separate read and write architectures increase initial boilerplate size.
