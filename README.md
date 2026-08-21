# architecture-as-equalizer

## Architecture as Capability Equalizer for Coding Agents

Dataset and experiment harness for the paper *"Architecture as Capability Equalizer for Coding Agents"* (Canedo, Siemens Digital Industries Software, 2026).

## Key Finding

Structured architecture specifications disproportionately benefit weaker LLM coding agents. On frontier models (Sonnet 4.6, GPT-5), specification format barely matters (quality spread 0.17--0.92). On non-frontier models, format produces spreads of 0.83--2.42 points. TypeScript interface contracts triple API route coverage for the weakest model (33% to 100%).

## Experiment Design

- **5 specification formats**: Prose, Mermaid + Constraints + ADRs, OpenAPI 3.0, C4/Structurizr DSL, TypeScript Contracts + ArchUnit Rules
- **6 models, 3 vendors**: Claude Sonnet 4.6, Claude Haiku 4.5, GPT-5, GPT-5-mini, Gemini 2.5 Pro, Gemini 2.5 Flash
- **90 trials** (5 formats x 6 models x 3 repetitions) + 3 no-architecture baseline trials
- **1 system under test**: Task Management API (7 components, 25 routes, event-driven architecture)

## Repository Structure

```
specs/                          # Architecture specifications (5 formats + 1 baseline)
  prose.md                      #   Natural language design document
  structured.md                 #   Mermaid diagrams + constraints + ADRs
  openapi.md                    #   OpenAPI 3.0 + Mermaid + constraints
  c4.md                         #   C4/Structurizr DSL
  typescript-contracts.md       #   TypeScript interfaces + ArchUnit rules
  functional-only.md            #   No-architecture baseline (requirements only)

harness/                        # Experiment runner and evaluation
  run-experiment.ts             #   Anthropic Sonnet runner
  run-haiku.ts                  #   Anthropic Haiku runner
  run-openai.ts                 #   OpenAI (GPT-5, GPT-5-mini) runner
  run-gemini.ts                 #   Google (Gemini Pro, Flash) runner
  run-no-arch.ts                #   No-architecture baseline runner
  judge-prompt.ts               #   LLM-as-judge evaluation prompt
  analyze-results.ts            #   Automated analysis (constraints, structure)
  arch-compliance.ts            #   Architecture compliance checker
  rejudge-gpt5.ts              #   Cross-vendor inter-judge validation
  types.ts                      #   Shared type definitions

trials/                         # Sonnet 4.6 trial data (15 trials)
trials-haiku/                   # Haiku 4.5 trial data (15 trials)
trials-gpt-5/                   # GPT-5 trial data (15 trials)
trials-gpt-5-mini/              # GPT-5-mini trial data (15 trials)
trials-gemini-25-pro/           # Gemini 2.5 Pro trial data (15 trials)
trials-gemini-25-flash/         # Gemini 2.5 Flash trial data (15 trials)
trials-no-arch/                 # No-architecture baseline (3 trials)

results/                        # Aggregated results and cross-model analysis
results-gemini-25-pro/          # Gemini Pro results
results-gemini-25-flash/        # Gemini Flash results
```

Each trial directory contains:
- `code/` -- Generated TypeScript project (the agent's output)
- `transcript.json` -- Full multi-turn conversation transcript
- `analysis.json` -- Automated constraint and structure analysis
- `judge-score.json` -- Sonnet 4.6 judge scores (4 dimensions, 1--10)
- `judge-score-gpt5.json` -- GPT-5 re-judging (where available, for inter-judge validation)

## Running the Experiment

Each vendor has its own runner script. Set the appropriate API keys:

```bash
cd harness
npm install

# Anthropic (Sonnet)
ANTHROPIC_API_KEY=your-key npx tsx run-experiment.ts

# Anthropic (Haiku)
ANTHROPIC_API_KEY=your-key npx tsx run-haiku.ts

# OpenAI (GPT-5 or GPT-5-mini)
OPENAI_API_KEY=your-key ANTHROPIC_API_KEY=your-key OPENAI_MODEL=gpt-5 npx tsx run-openai.ts

# Google (Gemini Pro or Flash)
GOOGLE_API_KEY=your-key ANTHROPIC_API_KEY=your-key GEMINI_MODEL=gemini-2.5-pro npx tsx run-gemini.ts

# No-architecture baseline
ANTHROPIC_API_KEY=your-key npx tsx run-no-arch.ts
```

The Anthropic API key is always required (for the Sonnet 4.6 judge). Each runner:
1. Creates independent agent sessions (max 50 turns, 16K tokens/turn)
2. Provides the agent with 5 tools: `write_file`, `read_file`, `list_files`, `run_command`, `done`
3. Captures the full transcript and generated codebase
4. Runs automated analysis (constraint violations, structure, compilation)
5. Runs the LLM judge (Sonnet 4.6, blind to specification format)
6. Skips already-completed trials (safe to re-run)

## Re-analyzing Existing Results

```bash
cd harness
npx tsx analyze-only.ts          # Re-run automated analysis on all trials
npx tsx arch-compliance.ts       # Architecture compliance scoring
npx tsx rejudge-gpt5.ts          # Inter-judge agreement (requires OPENAI_API_KEY)
```

## Evaluation Metrics

**LLM Judge** (Sonnet 4.6, blind to format):
- Architectural adherence (1--10)
- Completeness (1--10)
- Code quality (1--10)
- Constraint compliance (1--10)

**Automated Analysis**:
- API route coverage (25 specified routes)
- Weighted architecture compliance (components, communication, constraints, routes, data ownership, file structure)
- Constraint violations (cross-service imports, shared state, HTTP in services)
- TypeScript compilation (tsc --noEmit)

**Process Metrics**:
- Total tokens consumed
- Agent turns
- TSC attempts and pass rate
- Demo run rate (end-to-end self-validation)
- File rewrite rate (debugging intensity)

## Citation

```bibtex
@article{canedo2026architecture,
  title={Architecture as Capability Equalizer for Coding Agents},
  author={Canedo, Arquimedes},
  year={2026}
}
```

## License

This dataset is released for research purposes.
