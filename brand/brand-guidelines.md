# 🚀 Mani OS — Brand Guidelines

> **Your Personal Operating System.**

---

## 🌌 Philosophy & Core Values

Mani OS is not just a productivity app — it is an intelligent operating system that helps you manage health, focus, habits, knowledge, and goals from a unified, elegant workspace.

* **Adaptive**: Learns and changes layout priorities based on pattern vectors.
* **Intelligent**: Anticipates needs and provides explainable, context-aware suggestions.
* **Calm**: Minimalist styling and dark OLED tones keep focus high.
* **Fast**: Zero network roundtrips on core interaction paths; immediate UI state responses.
* **Reliable**: Durable local transaction ledgers and snapshot backups.
* **Private**: All telemetry and user data reside in secure local sandboxes.
* **Beautiful**: Premium styling, glassmorphism, and responsive layouts.

---

## 🎨 Visual Identity

### Theme
A futuristic operating system workspace. Minimal layout outlines, responsive grids, and subtle glowing overlays.

### Color Tokens
```text
Primary      #6366F1  (Indigo)
Accent       #00E5FF  (Cyan)
Success      #22C55E  (Emerald)
Warning      #F59E0B  (Amber)
Danger       #EF4444  (Rose)

Background   #09090B  (Zinc Black)
Surface      #111827  (Slate)
Glass        rgba(255, 255, 255, 0.05)
Border       rgba(255, 255, 255, 0.08)
```

---

## 🔤 Typography & Design System

* **Headings**: `Space Grotesk` or `Sora` for technical, geometry-inspired lettering.
* **Body Text**: `Inter` for readability.
* **Monospace Text (HUD/Diagnostics)**: `JetBrains Mono` for logs, debug outputs, and telemetry metrics.

---

## 🧩 Branded Components

Standardize and compose screens using these structural components:

* `<ManiCard />` — Glassmorphism backing, hover elevate shadows.
* `<ManiButton />` — Interactive action triggers with subtle press animation.
* `<ManiMetric />` — Monospace numbers, trend indicators.
* `<ManiProgress />` — Glowing smooth progress rings and bar meters.
* `<ManiDialog />` — Centered screen modals with backdrop blur.
* `<ManiPanel />` — Grid compartments with status tags.
* `<ManiCommandBar />` — Shorthand input triggers overlay.
* `<ManiChart />` — Telemetry trends visual graphs.
* `<ManiWidget />` — Mini status widgets.
* `<MissionCard />` — Daily mission checkboxes.

---

## 🖥 Splash Screen & Initializer

During platform bootstrap initialization, render:

```text
━━━━━━━━━━━━━━━━━━━━━━

          Mani OS

     Adaptive Intelligence
      Personal Dashboard

         Initializing...

━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🚀 Welcome Experience

On first launch, initialize with:

```text
━━━━━━━━━━━━━━━━━━━━━━

Welcome to

Mani OS

Adaptive Intelligence Platform

Let's configure your operating system.

[Initialize]

━━━━━━━━━━━━━━━━━━━━━━
```
