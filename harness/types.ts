export interface TrialConfig {
  id: string;
  specType: SpecType;
  specPath: string;
  outputDir: string;
}

export type SpecType = "prose" | "structured" | "openapi" | "c4" | "typescript-contracts";

export interface TrialTranscript {
  trialId: string;
  specType: SpecType;
  messages: TranscriptMessage[];
  startTime: string;
  endTime: string;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  inputTokens?: number;
  outputTokens?: number;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output?: string;
  error?: boolean;
}

export interface AnalysisResult {
  trialId: string;
  specType: SpecType;
  structural: StructuralAnalysis;
  constraints: ConstraintAnalysis;
  codeMetrics: CodeMetrics;
  transcriptMetrics: TranscriptMetrics;
}

export interface StructuralAnalysis {
  hasEventBus: boolean;
  hasUserService: boolean;
  hasProjectService: boolean;
  hasTaskService: boolean;
  hasCommentService: boolean;
  hasNotificationService: boolean;
  hasRouter: boolean;
  hasMainEntry: boolean;
  hasDemoScript: boolean;
  fileCount: number;
  folderStructureScore: number; // 0-10
  details: string[];
}

export interface ConstraintViolation {
  type: string;
  file: string;
  line: number;
  description: string;
}

export interface ConstraintAnalysis {
  directServiceCalls: ConstraintViolation[];
  sharedDataAccess: ConstraintViolation[];
  httpInServices: ConstraintViolation[];
  invalidStatusTransitions: ConstraintViolation[];
  externalDependencies: ConstraintViolation[];
  totalViolations: number;
}

export interface CodeMetrics {
  compiles: boolean;
  compilationErrors: string[];
  totalLines: number;
  totalFiles: number;
  linesPerFile: Record<string, number>;
}

export interface TranscriptMetrics {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  messageCount: number;
  toolCallCount: number;
  errorCount: number;
  retryCount: number;
  durationMs: number;
}

export interface JudgeScore {
  trialId: string;
  specType: SpecType;
  architecturalAdherence: number; // 1-10
  completeness: number; // 1-10
  codeQuality: number; // 1-10
  constraintCompliance: number; // 1-10
  overall: number; // average
  notes: string;
}

export interface ExperimentSummary {
  proseTrials: AnalysisResult[];
  structuredTrials: AnalysisResult[];
  proseJudgeScores: JudgeScore[];
  structuredJudgeScores: JudgeScore[];
  comparison: ComparisonResult;
}

export interface ComparisonResult {
  constraintViolations: { prose: number; structured: number; delta: number };
  compilationRate: { prose: number; structured: number };
  totalTokens: { prose: number; structured: number; delta: number };
  judgeScores: {
    prose: { mean: number; min: number; max: number };
    structured: { mean: number; min: number; max: number };
  };
  fileCount: { prose: number; structured: number };
  totalLines: { prose: number; structured: number };
}
