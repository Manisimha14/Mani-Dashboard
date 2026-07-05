# ADR 0003: Bounded Contexts (DDD) in AIP v3

## Status
Proposed

## Context
As more trackers (Nutrition, Habits, Sleep, Focus, Finance) are introduced, a monolithic folder structure under `src/services/` leads to coupling where a tracker accidentally references state from another. We need strict compile-time boundaries to make the platform extensible and isolate core business contexts.

## Decision
We will organize the code using **Domain-Driven Design (DDD) Bounded Contexts**.

Key details:
- Domains are organized into isolated boundaries (`Health`, `Productivity`, `Journal`, `Analytics`, `Platform`).
- Each bounded context hosts its internal models, aggregates, commands, events, projections, and domain interfaces.
- Inter-context communications must flow through command pipelines or the global Event Broker.

## Consequences
- **Pros**:
  - Clear ownership boundaries; changes to the Focus timer do not impact Hydration or Sleep.
  - Pluggable platform architecture using semantic configurations.
  - Scale development across teams easily as bounded contexts grow independently.
- **Cons**:
  - Cross-context data queries require mapping adapters or shared event telemetry listeners, adding layer conversions.
