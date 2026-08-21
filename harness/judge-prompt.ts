export function buildJudgePrompt(codeFiles: Record<string, string>): string {
  const fileList = Object.entries(codeFiles)
    .map(([path, content]) => `### ${path}\n\`\`\`typescript\n${content}\n\`\`\``)
    .join("\n\n");

  return `You are an expert software architect reviewing a Task Management API implementation.

The system should implement:
- User Service: CRUD for users (id, name, email)
- Project Service: CRUD for projects (id, name, description, memberIds), add/remove members
- Task Service: CRUD for tasks (id, title, description, status, assigneeId, projectId), assign, change status with forward-only transitions (todo → in-progress → done)
- Comment Service: create/get/delete comments on tasks (id, taskId, authorId, body, createdAt)
- Notification Service: in-memory notifications triggered by events (task.assigned, task.statusChanged, comment.added)
- Event Bus: in-memory pub/sub for inter-service communication
- API Router: HTTP entry point using Node.js built-in http module, delegates to services

Architectural rules:
1. No direct service-to-service calls — all inter-service communication via Event Bus
2. Each service owns its own data store exclusively
3. All HTTP handling is in the API Router only
4. Forward-only task status transitions
5. No external npm dependencies for application code
6. Each service in its own file

Review the following implementation and score it. Be strict and objective.

${fileList}

Respond with ONLY a JSON object in this exact format:
{
  "architecturalAdherence": <1-10>,
  "completeness": <1-10>,
  "codeQuality": <1-10>,
  "constraintCompliance": <1-10>,
  "notes": "<brief explanation of scores and any issues found>"
}

Scoring guide:
- architecturalAdherence: Does the code follow the described architecture? Are components separated correctly? Is the event bus used properly?
- completeness: Are all services implemented? All CRUD operations? All events? Demo script?
- codeQuality: Is the code clean, well-typed, and idiomatic TypeScript? Error handling?
- constraintCompliance: Are all 6 constraints respected? Each violation drops the score.`;
}
