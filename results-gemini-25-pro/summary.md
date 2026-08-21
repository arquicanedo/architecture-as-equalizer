# Experiment Results: Architecture Specification Format Comparison

**Date:** 2026-08-19
**Conditions:** 5 (c4, openapi, prose, structured, typescript-contracts)
**Trials per condition:** 3

## Summary Table

| Metric | c4 | openapi | prose | structured | typescript-contracts |
|--------| --- | --- | --- | --- | --- |
| Constraint Violations | 0.33 | 0.00 | 1.33 | 1.00 | 0.00 |
| Total Tokens | 243198.33 | 220734.67 | 145637.67 | 303553.00 | 666663.00 |
| Lines of Code | 601.67 | 752.67 | 651.67 | 726.00 | 899.00 |
| File Count | 7.67 | 9.00 | 9.33 | 9.00 | 10.33 |
| Tool Call Errors | 1.67 | 2.33 | 2.67 | 3.67 | 5.33 |
| Agent Turns | 18.33 | 18.00 | 19.00 | 23.00 | 37.00 |

## Judge Scores (1-10)

| Dimension | c4 | openapi | prose | structured | typescript-contracts |
|-----------| --- | --- | --- | --- | --- |
| architecturalAdherence | 7.00 | 6.33 | 5.67 | 5.67 | 4.00 |
| completeness | 5.67 | 7.33 | 5.67 | 7.33 | 5.33 |
| codeQuality | 7.00 | 7.67 | 6.33 | 7.00 | 5.00 |
| constraintCompliance | 7.00 | 6.33 | 5.67 | 5.67 | 3.67 |
| overall | 6.67 | 6.92 | 5.83 | 6.42 | 4.50 |

## Per-Trial Details

### Condition: c4

#### c4-1
- Files: 5, Lines: 292
- Compiles: NO
- Constraint violations: 0
- Tokens: 29435 (in: 27393, out: 2042)
- Tool calls: 5, Errors: 0, Retries: 0
- Structure score: 5/10
- Judge: arch=7 comp=4 quality=7 constraints=6 overall=6
- Judge notes: Architectural adherence is reasonable: EventBus is properly implemented as pub/sub, services own their data stores, and task/comment services publish events correctly. However, the router file is entirely missing from the submission, which is a major gap — Rule 3 (all HTTP handling in API Router only) cannot be evaluated. Completeness is significantly penalized: NotificationService is completely absent (no file submitted), the API Router is missing, and there is no demo/index script. Only 4 of 6 required service files are present. The comment-service violates Rule 1 subtly — it requires the router to pass taskTitle and authorName as parameters, meaning the router must query other services to gather that data before calling commentService.create(); this is a leaky abstraction that works around but does not cleanly satisfy the 'no direct service-to-service calls' rule, since the router becomes an orchestrator fetching cross-service data. Project-service has no event bus integration at all (no events published for member add/remove), and user-service similarly publishes no events. The task status transition logic is correct and clean. Code quality is good where present: TypeScript interfaces are well-defined, Map-based stores are appropriate, error handling in the EventBus catch block is present, and naming is consistent. The variable shadowing bug in removeMember (inner 'id' parameter shadows outer 'id' parameter in the filter callback) is a minor but real defect. Update methods accept all fields as required rather than partial updates, limiting flexibility. Overall the foundation is solid but the submission is incomplete — missing ~40% of required components.

#### c4-2
- Files: 9, Lines: 828
- Compiles: NO
- Constraint violations: 0
- Tokens: 443988 (in: 428133, out: 15855)
- Tool calls: 28, Errors: 3, Retries: 0
- Structure score: 10/10
- Judge: arch=7 comp=7 quality=7 constraints=8 overall=7.25
- Judge notes: Overall a solid implementation with good separation of concerns. Scores broken down by category: ARCHITECTURAL ADHERENCE (7/10): Event bus is correctly used for inter-service communication (task.assigned, task.statusChanged, comment.added). Each service owns its own Map-based data store. However, the router directly calls taskService.getById() and userService.getById() inside the comments POST handler to enrich the comment.added event payload — this is a subtle but real architectural violation (the router is performing cross-service data fetching to work around the no-direct-service-calls rule, passing denormalized data like taskTitle/authorName/taskAssigneeId into commentService.create). This is acknowledged in comments but the chosen solution still breaks the spirit of rule #1. The notification service's 'task.statusChanged' subscription only notifies on 'done' status, which is an undocumented narrowing of behavior. COMPLETENESS (7/10): All 6 services are present and in separate files. Full CRUD for users, projects, tasks is implemented. Add/remove members for projects works. Task assign and status change with forward-only transitions are present. Comment create/get/delete is present but GET /comments/:id is missing from the spec (spec says get comments on tasks, not individual comments — minor). The notification service's getByUser only returns UNREAD notifications, which silently filters — the demo's unread count message ('X unread') is misleading since the endpoint already filters. No getAll for tasks (only by projectId, which is acceptable per spec). No email uniqueness validation on user creation. The demo script is complete and functional. CONSTRAINT COMPLIANCE (8/10): No external npm dependencies used. Each service in its own file. Event bus used for inter-service comms. Forward-only status transitions enforced with validTransitions map. HTTP handling is in router only. The one violation is the router querying two services to pass data into a third service's create method, which is a workaround that technically keeps direct service-to-service calls out of services but puts cross-service orchestration logic in the router — borderline acceptable but architecturally impure. CODE QUALITY (7/10): TypeScript types are generally good. The router's pattern matching is functional but naive — it only captures a single ':id' segment and will have ambiguity issues if two routes of the same length both have params (e.g., '/projects/:id' vs '/tasks/:id' could collide in edge cases; the loop breaks on first match which is order-dependent on object key iteration). Route handler type uses void return but handlers are async — the RouteHandler type should be Promise<void>. Error handling in parseBody is good. The large comment block left in notification-service.ts is unprofessional/noisy. No input validation (missing required fields, invalid emails, etc.). The 'task.statusChanged' event includes assigneeId but the field name conflicts with the 'task.assigned' event convention (inconsistent naming between events). Memory leaks possible if tasks/comments deleted without cleaning up related notifications.

#### c4-3
- Files: 9, Lines: 685
- Compiles: NO
- Constraint violations: 1
  - [direct-service-import] src\services\notification-service.ts:3 — Service file imports another service: task-service
- Tokens: 256172 (in: 247484, out: 8688)
- Tool calls: 22, Errors: 2, Retries: 0
- Structure score: 10/10
- Judge: arch=7 comp=6 quality=7 constraints=7 overall=6.75
- Judge notes: Overall a solid implementation with clear structure, but several issues drag scores down. Architectural: Rule 1 (no direct service-to-service calls) is violated in router.ts where the comment POST handler calls both userService.getById() and taskService.getById() directly to validate and enrich data before passing to commentService — this cross-service coupling belongs in the event bus flow. The notification service acknowledges it cannot properly notify task assignees on comment.added due to the no-direct-call constraint, and punts by notifying the comment author instead — this is a functional correctness failure for that notification. Completeness: Task DELETE endpoint is missing from the router (taskService.delete() exists but is never exposed). Project DELETE endpoint is also missing from the router. Comment DELETE endpoint is missing from the router (commentService.delete() exists). No GET /comments/:id endpoint. The comment.added notification logic is semantically wrong — it notifies the author rather than the task assignee/project members, which is the intended behavior. Status transition allows skipping steps (todo → done is permitted since newIndex > oldIndex), which may or may not be intentional but is not spec-compliant for strict one-step transitions. Code quality: TypeScript types are reasonable but services lack input validation (empty strings, missing fields cause silent failures). parseJSONBody rejects on empty body which would break DELETE with body. The router is a large monolithic if-else chain with no middleware abstraction. Error discrimination in changeStatus returns undefined for both 'task not found' and 'invalid transition', making error reporting ambiguous to the client (both return 400 with same message). Constraint compliance: No external npm dependencies — compliant. Each service in its own file — compliant. Event bus used for inter-service communication — partially violated by router calling multiple services to enrich comment creation. Forward-only transitions implemented — compliant (though allows skipping). Services own their data exclusively — compliant. HTTP handling in router only — mostly compliant, though router imports services directly which is expected.

### Condition: openapi

#### openapi-1
- Files: 9, Lines: 744
- Compiles: NO
- Constraint violations: 0
- Tokens: 216744 (in: 207849, out: 8895)
- Tool calls: 18, Errors: 3, Retries: 0
- Structure score: 10/10
- Judge: arch=6 comp=7 quality=8 constraints=6 overall=6.75
- Judge notes: architecturalAdherence: The event bus is correctly implemented as a singleton pub/sub and used by TaskService and CommentService to publish events, with NotificationService subscribing — that pattern is sound. However, CommentService violates Rule 1 (no direct service-to-service calls) by accepting injected function references (getTask, getUser) from the router, which are direct closures over TaskService and UserService instances. This is a thin disguise over direct coupling; the spirit of the rule is broken even if it avoids a hard import. The router itself instantiates all services and wires them, which is acceptable for an API router acting as a composition root, but passing service method references into CommentService crosses the line. Rule 2 is otherwise respected — each service has its own Map store. Rule 3 is respected; all HTTP logic lives in router.ts. completeness: All five services are present. Full CRUD is implemented for users, projects, and tasks. Comment create/get/delete and list-by-task are present. Notification list and mark-as-read are present. Events task.assigned, task.statusChanged, and comment.added are all published and subscribed. Forward-only status transitions are implemented with STATUS_TRANSITIONS. The demo script exercises most flows. Missing: no email uniqueness validation on user creation; addMember does not verify the userId exists in UserService (cross-service validation is intentionally avoided, but worth noting as a functional gap); comment.added notification notifies only the author (acknowledged in a comment) rather than relevant stakeholders, which is a semantic gap; GET /tasks requires projectId which is a minor but potentially limiting design choice; no update endpoint for comments. codeQuality: TypeScript types are clean, interfaces are well-defined, Omit/Partial generics are used correctly. Error handling in the router is consistent with try/catch and typed sentinel return values (NOT_FOUND, INVALID_TRANSITION, TASK_NOT_FOUND, AUTHOR_NOT_FOUND) which is a reasonable pattern though mixing return types with union string literals instead of throwing is unconventional. The event bus has a try/catch per callback, preventing cascade failures. parseJSONBody will throw on empty body (e.g. GET requests) if called, though it is only called on POST/PUT routes. No input validation beyond presence checks (no type guards, no schema validation). constraintCompliance: Rule 1 violated by injected service method references in CommentService. Rule 5 (no external npm dependencies) is respected — only node built-ins used. Rule 6 (each service in its own file) is respected. Rules 2, 3, 4 are respected. The demo.ts is a bonus that works correctly as an integration script.

#### openapi-2
- Files: 9, Lines: 751
- Compiles: NO
- Constraint violations: 0
- Tokens: 285105 (in: 272564, out: 12541)
- Tool calls: 21, Errors: 3, Retries: 0
- Structure score: 10/10
- Judge: arch=6 comp=8 quality=7 constraints=6 overall=6.75
- Judge notes: architecturalAdherence: The event bus is correctly implemented and used by TaskService and NotificationService. However, there is a critical violation of Rule 1 (no direct service-to-service calls): the ApiRouter directly calls both taskService.getTask() and userService.getUser() inside the comment creation handler to retrieve taskTitle, authorName, and taskAssigneeId, then passes them into CommentService.createComment(). This means the router is acting as an inter-service mediator, which is an architectural anti-pattern here — CommentService's method signature leaks cross-service concerns. Rule 3 is also mildly violated: the router performs cross-service data lookups and validation logic (task/author existence checks) that arguably belong in a service layer. Rule 2 is respected — each service has its own Map store. completeness: All five services are implemented with full CRUD. All three events (task.assigned, task.statusChanged, comment.added) are published and consumed. The demo script exercises the full flow. Minor gaps: no GET /tasks/{id} sub-route ambiguity guard, no unsubscribe mechanism on the event bus, and the status transition logic only checks backward transitions rather than enforcing strict sequential ordering (e.g., todo→done is allowed, skipping in-progress). codeQuality: Code is generally clean and readable TypeScript. Return type of updateTaskStatus (Task | {error:string} | undefined) is awkward — a proper Result/Either type or exception would be cleaner. The router is a large monolithic if-else chain with no route table abstraction. parseJSONBody resolves '{}' on empty body which could mask missing-body errors. No input validation beyond existence checks (missing required fields not validated). constraintCompliance: Rule 1 violated (router mediates cross-service data flow for comment creation). Rule 4 (forward-only) is partially violated — todo→done transition is not blocked. Rules 2, 3 (partially), 5, and 6 are respected. Each violation meaningfully impacts the score.

#### openapi-3
- Files: 9, Lines: 763
- Compiles: NO
- Constraint violations: 0
- Tokens: 160355 (in: 152478, out: 7877)
- Tool calls: 15, Errors: 1, Retries: 0
- Structure score: 10/10
- Judge: arch=7 comp=7 quality=8 constraints=7 overall=7.25
- Judge notes: Overall a solid implementation with good separation of concerns, but several notable issues: (1) ARCHITECTURAL VIOLATION - The router performs cross-service lookups directly (e.g., userService.findById in project member routes, taskService.findById + userService.findById before creating comments). Rule 1 states no direct service-to-service calls, but more critically the router is acting as an orchestrator by querying multiple services to gather context (task title, author name) before calling commentService.create(), passing that context as a parameter — this is a workaround that still technically couples the router to data-gathering logic that should flow through events. (2) ARCHITECTURAL VIOLATION - CommentService.create() accepts a 'context' parameter (taskTitle, authorName) that was fetched by the router from other services. This means the event payload is enriched by cross-service data flowing through the router rather than through the event bus, which violates the spirit of rule 1. (3) The notification for comment.added notifies the comment author about their own comment ('You added a comment') which is acknowledged as a simplification but is semantically wrong — the task assignee or project members should be notified. (4) No email uniqueness validation in UserService. (5) Task GET by ID works but GET /tasks requires projectId query param — no way to get all tasks without a project filter, which is a minor completeness gap. (6) The parseJSONBody function will throw/reject on empty bodies (e.g., DELETE /users/:id has no body but won't call parseJSONBody, so that's fine), but empty POST bodies would cause a parse error rather than a clean 400. (7) The router correctly validates existence of referenced entities before operations (good cross-service lookup for referential integrity), but this is technically a rule 1 gray area since the router is supposed to be HTTP-only. (8) No input validation beyond existence checks (missing name/email/title fields not validated). (9) Status transition validation is well-implemented with forward-only enforcement. (10) Event bus implementation is clean and correct. (11) Each service is in its own file as required. (12) No external npm dependencies used. (13) Demo script is comprehensive and functional.

### Condition: prose

#### prose-1
- Files: 9, Lines: 602
- Compiles: NO
- Constraint violations: 2
  - [direct-service-import] src\notification-service.ts:2 — Service file imports another service: task-service
  - [direct-service-import] src\notification-service.ts:3 — Service file imports another service: comment-service
- Tokens: 232674 (in: 223018, out: 9656)
- Tool calls: 26, Errors: 5, Retries: 0
- Structure score: 10/10
- Judge: arch=6 comp=6 quality=6 constraints=7 overall=6.25
- Judge notes: Architectural Adherence (6/10): The event bus is used for task.assigned, task.statusChanged, and comment.added events, which is correct. However, the comment.added handler in main.ts directly calls taskService.getTask() — this is a cross-service call disguised inside a wiring module. While main.ts is the composition root, this logic should ideally live in the NotificationService reacting to data carried in the event payload rather than reaching back into TaskService. The NotificationService imports Task and Comment types from sibling services, creating type coupling. The handleCommentAdded method in NotificationService is a dead stub with a comment explaining it was punted to main.ts, which is a design smell. Completeness (6/10): Missing GET /tasks without projectId filter (returns nothing if no query param). The Comment interface uses 'text' but the spec says 'body' — field naming mismatch. No validation that a task/user/project actually exists before creating comments or assigning tasks. No unsubscribe mechanism on EventBus. handleCommentAdded in NotificationService is completely empty/dead code. GET /tasks with no projectId param silently returns nothing instead of all tasks or an error. No endpoint to get all tasks regardless of project. Code Quality (6/10): HTTP status codes are largely ignored — almost every response returns 200 even for not-found cases (returning undefined serialized as empty/null). No input validation — missing fields cause silent failures. Error handling in router catches exceptions but doesn't differentiate 400 vs 404 vs 500. The if-else chain in the router is fragile and doesn't scale. nextId counters are not robust. TypeScript typing is adequate but interfaces could be stricter (no readonly). Constraint Compliance (7/10): No external npm dependencies — compliant. Each service in its own file — compliant. Event bus used for inter-service communication — mostly compliant with the caveat about main.ts orchestration logic. Forward-only status transitions — correctly implemented. Data store ownership — mostly respected. HTTP handling in router only — compliant. The primary violation is the implicit service coupling via type imports and the cross-service taskService call in the event handler.

#### prose-2
- Files: 10, Lines: 656
- Compiles: NO
- Constraint violations: 1
  - [direct-service-import] src\notification-service.ts:4 — Service file imports another service: task-service
- Tokens: 100233 (in: 93571, out: 6662)
- Tool calls: 16, Errors: 1, Retries: 0
- Structure score: 10/10
- Judge: arch=5 comp=6 quality=7 constraints=5 overall=5.75
- Judge notes: ARCHITECTURAL ADHERENCE: Critical violation — NotificationService receives TaskService as a constructor dependency and calls this.taskService.getTask() directly (notification-service.ts lines with task lookup), which is direct service-to-service communication, violating Rule #1. The event bus payload should carry all necessary data (title, etc.) so NotificationService never needs to call TaskService. This is the most severe architectural flaw. EVENT BUS: Used for task.assigned, task.statusChanged, comment.added — correct direction, but the direct TaskService dependency undermines it. COMPLETENESS: Missing DELETE for comments (route not wired in api-router despite service method existing), missing PUT for projects (updateProject exists in service but no route), missing DELETE for projects (deleteProject exists but no route), missing DELETE for tasks (deleteTask exists but no route), missing GET/DELETE for individual comments by id, missing PUT for tasks (updateTask method exists but no route). Comment body field is named 'text' in implementation but spec says 'body'. Notification spec says createdAt field — present. CRUD gaps are significant. CONSTRAINT COMPLIANCE: Rule #1 violated (direct service call in NotificationService). Rule #2 satisfied. Rule #3 mostly satisfied. Rule #4 satisfied (valid transitions map is correct). Rule #5 satisfied (only crypto and http built-ins). Rule #6 satisfied. Two rules violated reduces score significantly. CODE QUALITY: TypeScript types are clean, Map usage is appropriate, error handling in event bus listeners is present, async/await used where needed, URL parsing is correct. Input validation is absent (no checks for missing required fields like name/email on user creation). Path matching is fragile (e.g., /users/123/anything would match /users/ GET). The validTransitions map could include 'done' key for completeness. Overall reasonably clean but the architectural violation and missing routes are significant issues.

#### prose-3
- Files: 9, Lines: 697
- Compiles: NO
- Constraint violations: 1
  - [direct-service-import] src\notification-service.ts:3 — Service file imports another service: task-service
- Tokens: 104006 (in: 96667, out: 7339)
- Tool calls: 15, Errors: 2, Retries: 0
- Structure score: 10/10
- Judge: arch=6 comp=5 quality=6 constraints=5 overall=5.5
- Judge notes: architecturalAdherence: Rule 1 (no direct service-to-service calls) is violated in api-router.ts where the comment POST route directly calls taskService.getTask() to validate task existence and extract assigneeId before publishing the event — the router is acting as an orchestrator between services. Rule 3 is also partially violated because CommentService publishes 'comment.added' internally but the router also publishes the same event with extra data (taskAssigneeId), creating a duplicate publish and tight coupling. The event bus is otherwise used correctly for notifications. completeness: Missing routes for PUT/DELETE users, GET/PUT/DELETE single project, DELETE members from project, DELETE tasks, PUT tasks (update), DELETE comments, GET single comment. The Comment interface uses 'text' but the spec says 'body'. Project interface uses 'members' but spec says 'memberIds'. The 'comment.added' event is fired twice (once in CommentService.addComment, once in the router) with different payloads. NotificationService subscribes to 'task.status.changed' but TaskService publishes 'task.status.changed' — these match, but the comment duplicate is a bug. codeQuality: No input validation (missing fields cause undefined behavior). JSON.parse in the request handler has no try/catch for malformed JSON outside the main try block (it's inside, so it is caught, but returns a generic 500). The duplicate event publication for comments is a logic bug. No TypeScript strict null handling in several places. Path parsing with split('/')[2] is fragile for nested routes. No request ID or structured logging. constraintCompliance: Violation 1 — api-router.ts directly calls taskService.getTask() to serve comment business logic (cross-service data access). Violation 2 — 'comment.added' event published twice with different shapes (CommentService and ApiRouter both publish it). Violation 5 is satisfied (no external npm deps). Violation 6 is satisfied (each service in its own file). Forward-only transitions are correctly implemented. EventBus is in-memory. Overall the skeleton is solid but has meaningful architectural and completeness gaps.

### Condition: structured

#### structured-1
- Files: 9, Lines: 716
- Compiles: NO
- Constraint violations: 0
- Tokens: 226869 (in: 218286, out: 8583)
- Tool calls: 22, Errors: 5, Retries: 0
- Structure score: 10/10
- Judge: arch=7 comp=8 quality=8 constraints=7 overall=7.5
- Judge notes: Overall a solid implementation with clear structure. Issues found: (1) ARCHITECTURAL VIOLATION - Rule 1 broken in router.ts: the comment POST handler directly calls `this.taskService.getById(taskId)` and `this.userService.getById(authorId)` to pass data to commentService.create(), creating implicit cross-service coupling through the router layer and leaking domain data (taskTitle, assigneeId, authorName) across service boundaries. The router becomes a data-fetching orchestrator rather than a pure HTTP handler. (2) ARCHITECTURAL VIOLATION - Rule 3 is partially violated: the router is performing business logic (fetching task/user data, extracting assigneeId) that belongs to the service or event layer. (3) The comment.added event payload is enriched with taskAssigneeId by routing through the router — a design smell acknowledged in comments but still present. (4) addMember returns undefined if member already exists (idempotency broken — should arguably return the project). (5) changeStatus returns undefined for invalid transitions vs. task-not-found — the router conflates both into a generic 400, losing diagnostic precision. (6) No input validation (missing required fields, empty strings, invalid email format) — services will create entities with undefined fields silently. (7) TaskService.changeStatus allows skipping statuses (todo→done directly) since it only checks newIndex > oldIndex rather than newIndex === oldIndex + 1. (8) No unsubscribe mechanism on EventBus. (9) DELETE /projects/:id/members reads body, which parseJsonBody skips for DELETE method — member removal via DELETE would always fail. (10) The demo script and all services are present and functional. TypeScript usage is clean and idiomatic throughout.

#### structured-2
- Files: 9, Lines: 772
- Compiles: NO
- Constraint violations: 0
- Tokens: 426693 (in: 412841, out: 13852)
- Tool calls: 27, Errors: 4, Retries: 0
- Structure score: 10/10
- Judge: arch=6 comp=7 quality=7 constraints=6 overall=6.5
- Judge notes: Architectural adherence: The event bus is used for task.assigned, task.statusChanged, and comment.added, which is correct. However, there is a significant violation: the Router directly calls both taskService.getById() and userService.getById() inside the POST /comments handler to fetch enrichment data (task title, author name, assignee ID) before passing it to commentService.create(). This means the Router is orchestrating cross-service data fetching and injecting it into CommentService, which breaks the 'no direct service-to-service calls' rule in spirit — the Router is acting as a cross-service mediator, and CommentService's create() signature accepts external data that was obtained by querying another service's store. The event payload for comment.added also embeds data that was fetched from TaskService and UserService by the router. Completeness: All six services are present. CRUD for users, projects, tasks, comments is implemented. Member add/remove is present. Task status transitions, assign, and all three notification event types are implemented. The demo script exercises all major flows. Missing: no getAll for tasks without projectId filter (minor), no validation of email uniqueness for users, no validation that assigneeId exists in UserService before assigning (the router doesn't verify this for /assign), no getAll for comments without taskId filter. The comment notification does not prevent notifying the author if they are also the assignee (noted in code but not fixed). Status transition allows same-status (oldIndex === newIndex passes), which is a minor logic gap. Code quality: TypeScript types are clean and consistent. Use of Map for in-memory stores is appropriate. Error handling exists in the event bus and router. parseBody handles empty body gracefully. The router is large but functionally organized. The comment in notification-service about self-notification is acknowledged but unresolved. Constraint compliance: Rule 1 (no direct service-to-service calls) is violated — the router queries taskService and userService to enrich comment creation data, effectively acting as a cross-service broker. This could be considered a rule 1 and rule 3 boundary violation. Rule 2 (each service owns its data) is respected. Rule 3 (HTTP handling only in router) is respected. Rule 4 (forward-only transitions) is implemented but allows same-status transitions (newIndex === oldIndex is not blocked). Rule 5 (no external npm dependencies) is respected — only built-in Node.js modules are used. Rule 6 (each service in its own file) is respected.

#### structured-3
- Files: 9, Lines: 690
- Compiles: NO
- Constraint violations: 3
  - [direct-service-import] src\services\comment-service.ts:3 — Service file imports another service: task-service
  - [direct-service-import] src\services\comment-service.ts:4 — Service file imports another service: user-service
  - [direct-service-import] src\services\notification-service.ts:3 — Service file imports another service: task-service
- Tokens: 257097 (in: 246144, out: 10953)
- Tool calls: 20, Errors: 2, Retries: 0
- Structure score: 10/10
- Judge: arch=4 comp=7 quality=6 constraints=4 overall=5.25
- Judge notes: Critical architectural violations: (1) CommentService takes direct constructor dependencies on TaskService and UserService — explicit service-to-service coupling violating Rule 1. (2) NotificationService takes a direct constructor dependency on TaskService, also violating Rule 1. The comment acknowledges this as a 'pragmatic choice' but it is a clear spec violation. (3) Router instantiates CommentService and NotificationService with service references, cementing the coupling. These two violations are fundamental to the architecture. Constraint 2 (each service owns its own data store exclusively) is weakened because NotificationService calls taskService.getById() in onCommentAdded — it reads another service's store directly instead of relying solely on event payloads. The fix would be to embed all needed data in the event payload at publish time. Forward-only status transition logic is also broken: the code explicitly allows resetting from any state back to 'todo' (newStatus !== 'todo' guard), which contradicts the forward-only requirement. Completeness is reasonable: all five services exist, CRUD is implemented for all entities, events are published for task.assigned/task.statusChanged/comment.added, and a demo script exists. Missing: no input validation (missing fields return undefined silently rather than 400 errors), no email uniqueness check, GET /tasks with no query param has no list-all route, removing a member body via DELETE is non-standard and fragile. Code quality is adequate TypeScript but uses 'any' in several places (event bus payload types, parseJsonBody return, demo ApiResponse alias), error handling returns undefined instead of throwing typed errors leading to silent 200 responses with undefined bodies, and services mutate objects in-place (returning references to internal state). The event bus itself is well-implemented. Overall the two service-to-service direct dependency violations are severe given they are the central architectural constraint.

### Condition: typescript-contracts

#### typescript-contracts-1
- Files: 10, Lines: 850
- Compiles: NO
- Constraint violations: 0
- Tokens: 679539 (in: 659521, out: 20018)
- Tool calls: 39, Errors: 4, Retries: 0
- Structure score: 10/10
- Judge: arch=6 comp=8 quality=7 constraints=6 overall=6.75
- Judge notes: Architecturally the structure is largely correct — services are separated into their own files, the event bus is used for inter-service communication for task and comment events, the router centralizes HTTP handling, and each service owns its own Map-based data store. However, there are notable violations: (1) CommentService directly calls taskService.getById() and userService.getById() in its constructor injection and within create(), which is a direct service-to-service call, violating Rule 1. The comment.added event payload was pre-enriched to work around this, but the direct calls still exist. (2) NotificationService similarly calls taskService.getById() inside handleCommentAdded(), another direct service-to-service call — the taskId was already in the event payload and the task data could have been included in the payload to avoid this. These two violations are significant. Completeness is good: all five services are present, all required CRUD operations are implemented, all three events (task.assigned, task.statusChanged, comment.added) are published and handled, forward-only status transitions are enforced, and the demo script exercises all major flows. Minor gaps: no email uniqueness validation, no input validation beyond existence checks, GET /tasks without projectId returns nothing useful (silently filters to empty), and the DELETE /projects/:id/members route reads userId from request body which is non-standard. Code quality is generally clean with good TypeScript typing, interface contracts in types.ts, and consistent error handling patterns. The router is verbose but functional. The handleSuccess method's undefined check provides implicit 404 handling but only when services return undefined rather than throw, creating inconsistency since most services throw. The demo script has a fragile 1-second startup delay. No external npm dependencies are used, Node.js built-in http module is used correctly, and each service is in its own file — these constraints are satisfied.

#### typescript-contracts-2
- Files: 10, Lines: 863
- Compiles: NO
- Constraint violations: 0
- Tokens: 1001883 (in: 987261, out: 14622)
- Tool calls: 50, Errors: 9, Retries: 0
- Structure score: 10/10
- Judge: arch=6 comp=8 quality=8 constraints=5 overall=6.75
- Judge notes: ARCHITECTURAL ADHERENCE (6/10): The event bus is used correctly for task.assigned, task.statusChanged, and comment.added events. However, there are two significant violations: (1) CommentService directly injects and calls IUserService and ITaskService to fetch author/task data for building the event payload — this is a direct service-to-service call, violating Rule 1. The author name and task title should either be passed in from the router layer or the payload enrichment should be done differently. (2) NotificationService directly injects and calls ITaskService to look up the task's assigneeId in handleCommentAdded — another direct service-to-service call violating Rule 1. The CommentAddedPayload should include assigneeId so NotificationService doesn't need to call TaskService. Each service is in its own file (Rule 6 satisfied). Data stores are per-service (Rule 2 satisfied). HTTP handling is in ApiRouter only (Rule 3 satisfied). COMPLETENESS (8/10): All five services are implemented. All CRUD operations are present. All three events are published and handled. Demo script is included and exercises the full flow. Missing: GET /tasks without projectId filter returns nothing (no 404/400 response, just falls through); getByUser only returns unread notifications which may be a design choice but limits utility; no email uniqueness validation on user creation; addMember doesn't validate userId existence. CONSTRAINT COMPLIANCE (5/10): Rule 1 violated twice (CommentService→UserService, CommentService→TaskService, NotificationService→TaskService — these are direct calls, not event-driven). Rules 2, 3, 4, 5, 6 are all satisfied. The forward-only status transition logic is correct and handles the skip case (todo→done). CODE QUALITY (8/10): Clean TypeScript with proper interfaces and generics. Good use of Map for storage. Error messages are consistent. The parseBody function doesn't handle empty body gracefully (throws JSON.parse error on non-POST requests if called). Error status code detection via string matching ('not found') is fragile. The router uses a long if-else chain which is acceptable but could use a routing table. Overall solid idiomatic TypeScript with good separation of concerns modulo the constraint violations.

#### typescript-contracts-3
- Files: 11, Lines: 984
- Compiles: NO
- Constraint violations: 0
- Tokens: 318567 (in: 305562, out: 13005)
- Tool calls: 22, Errors: 3, Retries: 0
- Structure score: 10/10
- Judge: arch=0 comp=0 quality=0 constraints=0 overall=0
- Judge notes: Parse error: ```json
{
  "architecturalAdherence": 5,
  "completeness": 7,
  "codeQuality": 6,
  "constraintCompliance": 5,
  "notes": "ARCHITECTURAL VIOLATIONS: (1) CommentService receives ITaskService and IUserS

## Constraint Violation Breakdown

| Type | c4 | openapi | prose | structured | typescript-contracts |
|------| --- | --- | --- | --- | --- |
| directServiceCalls | 1 | 0 | 4 | 3 | 0 |
| sharedDataAccess | 0 | 0 | 0 | 0 | 0 |
| httpInServices | 0 | 0 | 0 | 0 | 0 |
| invalidStatusTransitions | 0 | 0 | 0 | 0 | 0 |
| externalDependencies | 0 | 0 | 0 | 0 | 0 |
