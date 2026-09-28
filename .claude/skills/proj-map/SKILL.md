---
name: proj-map
description: Create, read, or edit the project's map at $repoRoot/.projMap/projMap.json — a recursive JSON tree of Components (systems, services, apps, libraries, modules, files, functions, classes, ...) each carrying its own functional/non-functional requirements, actors, use cases, architecture style, subcomponents, interactions, tech stack, and diagrams. Use whenever the user wants to document, inspect, or update project/system/service architecture, requirements docs, use cases, actor roles, component diagrams, tech stack mapping, or asks about "projMap", "project map", "component tree", "architecture map", or similar structural/requirements documentation.
skillmancy-version: "0.2.0"
---

# Proj Map

Read [projMap.schema.json](./references/projMap.schema.json). Use it as a base to create, read, edit the `$repoRoot/.projMap/projMap.json` file.

`projMap.json` aims to describe the project stored in the current repo with the granularity preferred by the user.

You may use json schema validation libraries to assert the correct structure of the file.

**Some suggestions**:
- Keep implementation details in the requirements low to none when closer to the top of the graph and make them more granular the closer you are to code.
- Requirements in the lower levels don't necessarily need to derive from higher level requirements (a requirement for a library may mention implementation details that may be not covered by higher level requirement). It is still important that requirements don't contradict each other.
