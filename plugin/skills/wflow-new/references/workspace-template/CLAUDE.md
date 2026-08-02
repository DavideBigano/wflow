# <Workspace name>

<!-- One line: what raw input goes in, what trusted output comes out. -->
ICM workspace: <one-line purpose>.

## How to run

Execute one stage at a time, in order. Stages are meant to be self-contained or they list necessary external files into the input table. Each stage contains it's own `CLAUDE.md`. 
Stages can be skipped.

### Starting the workflow
If missing for this run, create `run.json` and validate it with `shared/run.schema.json`.
Position the agent's `cwd` into stage `01` to read both the top level and stage-specific `CLAUDE.md`.
If you are in a different stage it means the workflow has already started.

### Running a stage
Using the stage-specific `CLAUDE.md`:
1. Read all the `input` files.
2. Execute the `process`.
3. Write the `outputs` accordingly.
The current stage ends when the user approves all `outputs` generated.

### Continuing to the next stage
1. Once user approves move the agent's `cwd` into the next stage's folder.
2. Let the user run `/clear`.
3. Wait for user input before running the current stage.
	
## Pipeline

<!-- Mantain this structure, fill in with actual workspace stages. -->

| Stage | Job |
| - | - |
| 01-<stage-name> | Short, declarative description. ~10 words max |
| ... | ... |
| NN-<stage-name> | Short, declarative description. ~10 words max |

## Layers

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

## Archiving and restoring runs

Only one project may be "running" (populated under `stages/*/outputs/` and `stages/run.json`) at a time. To snapshot the current run out of the way, or bring a previous one back in, use the `archiver` CLI in `./scripts/archiver/` instead of moving files by hand.

Usage:
- `node dist/cli.mjs archive` — moves the currently running project into `./archive/<run-id>/`, emptying the stage output folders and `run.json`. Requires a valid run-id is stored at `stages/run.json`.
- `node dist/cli.mjs restore <run-id> [-a | --auto-archive]` — moves an archived project back into `stages/*/output/`. Fails if a project is already running unless the `-a`/`--auto-archive` flag is provided (archives the running project before restoring the target).
- `node dist/cli.mjs --help` — full command/flag reference.

## Map

<!-- Mantain this structure, edit with actual workspace structure. -->

```
<workspace-name>/
├── CLAUDE.md
├── archive/
├── config/                           # Optional
|   ├── config-file-1.<ext>
|   ├── ...
│   └── config-file-N.<ext>
├── scripts/                           # Optional
│   ├── script-1/
│   ├── ...
│   └── script-N/
├── shared/                            # Optional
|   ├── run.schema.json
|   ├── shared-file-1.<ext>
|   ├── ...
│   └── shared-file-N.<ext>
└── stages/
    ├── CLAUDE.md                      # Optional — cross-stage contract
    ├── run.json                       # Run-specific metadata
    ├── 01-<stage-name>/
    |   ├── CLAUDE.md
    |   ├── outputs/
    |   ├── references/                # Optional
    |   |   ├── reference-file-1.<ext>
    |   |   ├── ...
    |   |   └── reference-file-N.<ext>
    |   └── scripts/                   # Optional
    |       └── ...
    ├── ...
    ├── NN-<stage-name>/
    |   └── ...
    └── outputs/                       # Optional
```
