---
name: wflow-new
description: Scaffolds a new ICM (Interpretable Context Methodology) wflow workspace. Interviews the user to design a staged pipeline, then builds a ready-to-run workspace. Surfaces useful conventions as suggestions. Never assumes the user knows ICM conventions. Use when starting a new ICM/wflow pipeline from scratch. For the underlying model of an existing workspace, use wflow-reference instead.
skillmancy-version: "0.2.0"
---

# wflow new

## Guidelines

**Be direct, not diplomatic** — Say what needs to be said, clearly and with reason. Pushback is not a reflex: if a choice is well-reasoned and the tradeoffs are understood, say so and move forward. (Yes: ["This stage's job duplicates the previous one — merge them"] / No: ["That could work, maybe consider..."])

**Don't burden the user with jargon** — Drive the interview in plain terms about what the user's pipeline actually does; only bring in ICM/wflow vocabulary (config vs shared, cross-stage contract, run-id pattern, ...) if the user already uses it or explicitly asks about it. (Yes: "What does this stage produce, and what does it need to get there?" / No: "Does this stage needs a cross-stage contract?")

**Suggest, don't require** — The four creation-time suggestions (schema conventions, altitude discipline, traceability, delegating computation) are offered as questions during the interview, never enforced or silently applied. (Yes: "Want this stage's outputs to reference a JSON Schema?" / No: adding a schema file the user didn't ask for)

---

## Task

0. If the `wflow-reference` skill's model isn't already in context, load it first — this skill builds the workspace `wflow-reference` describes, and every downstream step assumes that model is known.
1. Interview the user to produce a workflow spec. In this conversation derive:
   - A stage pipeline
   - A spec for what each stage does. Aim to keep the spec declarative. Make it only as detailed as the user goes in depth on the topic.
   During this conversation surface the suggestions detailed [here](#creation-time-suggestions).
   Move on when the user is satisfied.
2. - Ask whether the user wants a specific run-id formating to add to the new workspace's `run.schema.json`.
3. - Ask wether this workflow is meant to be used by a single user or with multiple users that may want personalized configurations. This ties into the `config/` vs `shared/`/`references/` differentiation.
4. Build a workflow skeleton: 
   - Copy `references/workspace-template/` to the target path.
   - Copy `references/stage-template/` once per approved stage, renamed `NN-stage-name`.
   - Delete all the `.placeholder` files copied from the templates.
   - Update `shared/run.schema.json` run id format if needed.
5. Fill in the skeleton with configs, shared, references, scripts and `CLAUDE.md`'s according to the derived spec. During the process keep an eye on:
   - Stage-specific vs cross-stage `CLAUDE.md` definition
   - Placement of outputs
   - Script usage
   If something emerges that the approved spec doesn't cover, or that clashes with it — stop and ask for clarification.
6. Report the created tree.

---

## Resources

### Creation-time suggestions

Four questions to surface while gathering a stage's Process and Outputs (step 2) — offer them, don't apply them unasked.

**Structured data vs discoursive prose** — Depending on what a stages output is, consider if it lands better to a structured data approach (like with json) or to a more free form prose (like an MD doc).

**JSON usage** — When using JSON files as outputs suggest defining a JSON Schema. This may help both in output validation and in directing the model on how to fill in the output through typing, formatting, JSON schema titles and descriptions. JSON schema is helpful because it's well defined and information dense.

**Altitude discipline** — When you see a stage's job creeping into a later stage's territory (e.g. an early stage drifting into solution design), ask whether to keep it scoped to its own altitude leaving that work to the stage built for it.

**Traceability** — When a stage's outputs are derived from an earlier stage's items, ask whether each output should reference which upstream item(s) justify it, so gaps surface early instead of silently.

**Delegating computation** — When a stage's process involves deterministic calculation (aggregation, calibration, rendering), ask whether that step should be a script the stage runs against its output file, rather than the agent computing it by hand.
