---
name: wflow-reference
description: Passive reference primer on the ICM (Interpretable Context Methodology) workspace model — the general operating rules and structure any wflow-managed workspace follows, independent of the specific pipeline it implements. Covers the layered directory model, the CLAUDE.md contracts, the run lifecycle, and the self-containment rule for stages. Load this before creating, editing, or reasoning about any ICM/wflow workspace, stage, or its skills/CLI tools — regardless of what domain pipeline it implements.
skillmancy-version: "0.2.0"
---

# wflow reference

## Task

This skill is a passive primer: it equips you to design, read, or operate any ICM-inspired (Interpretable Context Methodology) workspace under wflow. Internalize the model in Resources before creating or modifying a workspace's stages, schemas, or tooling.

---

## Resources

### Workspace model

An ICM workspace is a directory that turns some raw input into an output through a sequence of stages. Each stage produces outputs for the user to review, before moving onto the next stage. Each stage may read outputs from any previous stages as input. The workspace's root `CLAUDE.md` states its one-line purpose, how to run it, its stage pipeline, its layers, and a map of the tree. Anyone (human or agent) should be able to read that one file and know how to operate the whole thing. Each stage has it's own `CLAUDE.md` that defines `inputs`, `outputs` and the process to produce that output. Additionally there's an optional `stages/CLAUDE.md` that applies to every stage, defining inputs, processes or outputs common to all of them. It lives at `stages/CLAUDE.md`.

The use of scripts to automate or make an operation more reliable. Can be invoked by both users and agents.

### Layers

| Layer | Purpose | Lifetime |
|---|---|---|
| `config/` | Cross-stage reference material | Cross-run |
| `scripts/` | Cross-stage scripts | Cross-run |
| `shared/` | Cross-stage reference material | Cross-run |
| `stages/CLAUDE.md` | Cross-stage contract, auto-loaded whenever `cwd` sits inside a stage | Cross-run |
| `stages/run.json` | Metadata file for the live run | Run-specific |
| `stages/<NN>-<stage-name>/` | One directory per stage, ordered by a zero-padded numeric prefix (`01-`, `02-`, ...) | Cross-run |
| `stages/<NN>-<stage-name>/references/` | Stage-specific reference material | Cross-run |
| `stages/<NN>-<stage-name>/outputs/` | Current-run artifacts for the NNth stage | Run-specific |
| `stages/<NN>-<stage-name>/scripts/` | Stage-specific scripts | Cross-run |
| `stages/outputs/` | Optional output folder for artifacts that mutate across stages | Run-specific |
| `archive/` | Snapshots of completed or parked runs | n/a |
| `archive/<run-id>/` | Snapshota of a single archived run | n/a |
| `archive/<run-id>/run.json` | Metadata file for the archived run | n/a |
| `archive/<run-id>/<NN>-<stage-name>` | Snapshot of the NNth stage of the archived run | n/a |

Compared to `shared/`, `config/` holds data that is instance specific. Two users can run the same workspace and need some references that are the same and some that are different — `config/` is for data that changes, `shared/` (and `stages/NN-name/references/`) is for data that stages the same. This means that differentiating between the two is meaningless with only one user.

### CLAUDE.md contracts

These are used to load the relevant information at stage execution. Each is positioned to leverage Claude Code's CLAUDE.md autoload feature.

- **Root contract** — States the workspace's purpose, how to run it, the stage pipeline, layer purposes, and a directory map — everything needed to operate the whole workspace.
- **Stage contract** — Defines one stage's framing, its inputs table, the process to execute, and its outputs table — ending only once the user approves every output produced.
- **Cross-stage contract** — An optional `stages/CLAUDE.md`, auto-loaded whenever `cwd` sits inside a stage, defining inputs, process steps, or outputs shared across all stages rather than repeated per stage.

### Stages

Stages are meant to be self-contained: everything a stage needs is either produced by an earlier stage and named in its input table (or in the cross-stage input table), or lives in `config/`/`shared/`. Stages can be skippable if the pipeline says so.

A good analogy for stages is with functions: a stage takes predefined inputs and produces an output.

A stage may also operate either like a pure function when it only creates files in the stage-specific `outputs/` folder. Conversely a stage could also edit a preexisting file (e.g. a file inside `stages/output/`) like a side-effect of an impure function. 

### Run lifecycle

- Exactly **one run is "in flight"** per workspace at a time — populated under `stages/*/outputs/`.
- A run is identified by an id held in `run.json`, a file created before starting the first stage using `shared/run.schema.json`.
- Execution moves one stage at a time: the agent's working directory (or focus) sits inside the current stage; reads that stage's `CLAUDE.md` plus the root and cross-stage (if present) ones; reads inputs, runs processes and writes outputs; stops to let the user review the outputs. The user may then decide to either fix the outputs or run the subsequent stage.
- Moving to the next stage is a deliberate handoff: only after approval, typically one stage forward and with a fresh context (e.g. `/clear`) so the next stage starts clean and re-derives what it needs from the `inputs`. If the user finds that critical information is lost between each stage, they should find the proper place to store it in a relevant output (run-specific) or config/shared/reference (persistent) file
- Archiving a run means moving a finished or interrupted run's output units (every `stages/*/outputs/` plus `stages/outputs/` and `stages/run.json`) into `archive/<slug>/`, emptying the live output directories. Restoring reverses that. This is CLI-tool work (a small archiver script/TUI), not manual file moves — the tool enforces the one-run-at-a-time invariant and refuses to clobber a running project without an explicit override.
