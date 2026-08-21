# Experiment Results: Architecture Specification Format Comparison

**Date:** 2026-08-19
**Conditions:** 5 (c4, openapi, prose, structured, typescript-contracts)
**Trials per condition:** 3

## Summary Table

| Metric | c4 | openapi | prose | structured | typescript-contracts |
|--------| --- | --- | --- | --- | --- |
| Constraint Violations | 0.00 | 0.00 | 0.33 | 0.00 | 0.00 |
| Total Tokens | 254188.67 | 129550.33 | 160811.33 | 136375.67 | 432909.00 |
| Lines of Code | 821.67 | 592.00 | 605.67 | 512.67 | 1037.00 |
| File Count | 8.00 | 6.67 | 7.67 | 6.33 | 10.00 |
| Tool Call Errors | 1.33 | 1.33 | 1.00 | 1.33 | 3.33 |
| Agent Turns | 13.67 | 10.33 | 14.33 | 11.00 | 25.00 |

## Judge Scores (1-10)

| Dimension | c4 | openapi | prose | structured | typescript-contracts |
|-----------| --- | --- | --- | --- | --- |
| architecturalAdherence | 6.67 | 6.67 | 6.00 | 6.00 | 5.67 |
| completeness | 6.33 | 5.33 | 5.00 | 5.33 | 8.00 |
| codeQuality | 7.33 | 7.33 | 6.67 | 7.00 | 7.33 |
| constraintCompliance | 7.00 | 6.67 | 5.33 | 5.67 | 5.67 |
| overall | 6.83 | 6.50 | 5.75 | 6.00 | 6.67 |

## Per-Trial Details

### Condition: c4

#### c4-1
- Files: 10, Lines: 985
- Compiles: NO
- Constraint violations: 0
- Tokens: 606937 (in: 593349, out: 13588)
- Tool calls: 24, Errors: 4, Retries: 0
- Structure score: 10/10
- Judge: arch=8 comp=8 quality=8 constraints=8 overall=8
- Judge notes: Overall a solid implementation. Architectural adherence is good: event bus is used for inter-service communication, each service owns its data store, HTTP handling is isolated in router.ts, and each service is in its own file. Issues: (1) NotificationService is imported directly in main.ts to force initialization — acceptable workaround but architecturally awkward; the router also imports notificationService directly to expose notification endpoints, which is unavoidable given the constraints but still couples the router to the notification service. (2) The comment.added notification logic is self-aware about its architectural limitation and notifies the comment author instead of the task assignee — this is a real design gap; the CommentAddedEvent payload lacks assigneeId, so the notification is semantically wrong (authors don't need to be notified of their own comments). The event payload should have been enriched at publish time by task service or the comment service should include assigneeId in the event. (3) Status transition allows todo→done directly, which contradicts the specified forward-only sequential chain (todo→in-progress→done); the comment in code acknowledges ambiguity but the spec implies sequential steps. (4) types.ts imports randomUUID but never uses it — unused import. (5) DELETE /projects/:id/members reads body via getJsonBody which is called a second time after the body stream may already be consumed — this is a bug for the member removal endpoint since the body is parsed inside the DELETE branch after other checks that don't consume it, but it's still fragile. (6) Error classification in the router catch block uses string matching on error messages, which is brittle. (7) No input validation that referenced projectId/assigneeId actually exist (cross-entity referential integrity), though the architectural rules make this hard without direct calls. (8) 204 responses call sendJson with null which still calls JSON.stringify(null) = 'null' and sends a body, which is non-standard for 204. (9) The unused BASE_URL constant in demo.ts is a minor cleanliness issue. Despite these issues, the implementation is largely functional and well-structured.

#### c4-2
- Files: 6, Lines: 376
- Compiles: NO
- Constraint violations: 0
- Tokens: 36946 (in: 34099, out: 2847)
- Tool calls: 6, Errors: 0, Retries: 0
- Structure score: 5/10
- Judge: arch=5 comp=4 quality=6 constraints=6 overall=5.25
- Judge notes: Several significant issues found: (1) MISSING FILES: NotificationService, API Router, and main entry point are entirely absent — these are core required components. Only 5 of the required 7 files/components are present. (2) ARCHITECTURAL RULE 1 VIOLATION: CommentService accepts 'authorName' as a parameter, meaning the caller (API Router) must resolve user details before calling the service — this implies the router is doing cross-service lookups that arguably should flow through events, and the taskTitle placeholder is left empty in the CommentAddedEvent, breaking notification utility. (3) ARCHITECTURAL RULE 3 VIOLATION: Cannot be verified since the API Router is missing, but the services accept raw parameters suggesting the router would need to do cross-service validation (e.g., verifying assigneeId exists in UserService before calling TaskService.assign), which would be a direct service-to-service concern. (4) No validation that assigneeId, projectId, or taskId reference existing entities — referential integrity is ignored entirely. (5) Status transition allows same-status no-ops which contradicts 'forward-only' semantics. (6) ProjectService emits no events at all — member add/remove could warrant events for notification purposes. (7) UserService seeds data in constructor, which is test pollution in production code. (8) generateUUID is duplicated across every service file instead of being a shared utility. (9) The event bus is solid and well-structured. (10) TypeScript types are reasonable but EventCallback uses 'any'. (11) No demo/test script present. Overall the submitted code is a partial skeleton missing critical components.

#### c4-3
- Files: 8, Lines: 1104
- Compiles: NO
- Constraint violations: 0
- Tokens: 118683 (in: 107456, out: 11227)
- Tool calls: 10, Errors: 0, Retries: 0
- Structure score: 9/10
- Judge: arch=7 comp=7 quality=8 constraints=7 overall=7.25
- Judge notes: Overall a solid implementation with good structure, but several notable issues: (1) ARCHITECTURAL: The router directly queries UserService and ProjectService to validate references before calling TaskService/CommentService (e.g., verifying assigneeId, projectId, authorId), which is effectively cross-service coupling routed through the router layer rather than the event bus — this violates ADR-001's spirit even if not a direct service-to-service call. CommentService.create() accepts taskTitle, authorName, and taskAssigneeId as parameters passed from the router, meaning the router had to query UserService and TaskService to gather this data — this is a workaround that leaks cross-service knowledge into the router. (2) COMPLETENESS: No demo/seed script provided. No GET /notifications/:id endpoint. No way to query all tasks without a projectId (minor). The @deprecated JSDoc tags reference a type centralization that was never implemented, suggesting incomplete refactoring. The 'comment.added' notification only notifies the assignee, not the task author or project members — requirements are ambiguous but the narrow coverage is a gap. No pagination or filtering beyond projectId/taskId/userId. (3) CODE QUALITY: TypeScript types are reasonably well-used but 'any' appears in EventBus callbacks reducing type safety. The EventBus payload types are inline in NotificationService rather than shared. Graceful shutdown is a nice touch. Return type consistency is good. The unsubscribe functions returned by EventBus.subscribe() are never stored or used, creating a minor memory/lifecycle issue. (4) CONSTRAINT COMPLIANCE: No external npm dependencies — compliant. Each service in its own file — compliant. Forward-only status transitions enforced — compliant. HTTP handling in router only — mostly compliant. Event bus used for inter-service notification — compliant. However, the router performing cross-service lookups to enrich event payloads (passing taskTitle, authorName to CommentService) is a gray-area violation of service boundary rules.

### Condition: openapi

#### openapi-1
- Files: 6, Lines: 430
- Compiles: NO
- Constraint violations: 0
- Tokens: 52958 (in: 49866, out: 3092)
- Tool calls: 6, Errors: 0, Retries: 0
- Structure score: 5/10
- Judge: arch=7 comp=5 quality=8 constraints=7 overall=6.75
- Judge notes: Architectural adherence is solid for the provided files: EventBus is a proper pub/sub, services own their own stores, no direct service-to-service calls are visible, and status transitions are forward-only. However, the API Router file is entirely missing from the review, which is a critical component (rule: all HTTP handling in API Router only). The Notification Service is also entirely absent. CommentService.createComment accepts taskTitle and authorName as parameters, which implies the API Router is doing cross-service lookups before calling the service — this is a design smell that pushes orchestration logic into the router rather than keeping it clean, and could indicate a violation of the event-bus-only inter-service communication rule depending on implementation. The changeTaskStatus method publishes an event even when status doesn't change (oldStatus === newStatus branch still reaches eventBus.publish), which is a logic bug. The removeMember method returns the unmodified project even when the member wasn't found, losing the ability for callers to distinguish 'not found' from 'member not in project'. Completeness is significantly reduced: NotificationService is missing, API Router is missing, no demo/bootstrap script is shown, and getAllTasks (global) is absent. Code quality is generally high: clean TypeScript types, proper async signatures, use of crypto.randomUUID, good use of Map. The types.ts file is well-structured with branded ID types and clear interfaces. setImmediate usage in EventBus is a reasonable decoupling choice but means publish errors won't propagate to callers. Constraint compliance: no external npm deps satisfied, each service in own file satisfied for shown files, forward-only transitions satisfied, event bus used for notifications (where visible). Missing files prevent full constraint verification.

#### openapi-2
- Files: 9, Lines: 1023
- Compiles: NO
- Constraint violations: 0
- Tokens: 296877 (in: 286549, out: 10328)
- Tool calls: 20, Errors: 4, Retries: 0
- Structure score: 10/10
- Judge: arch=6 comp=7 quality=7 constraints=6 overall=6.5
- Judge notes: Architectural adherence: The event bus is used for notifications, but the router directly calls multiple services within a single request handler (e.g., comment creation fetches user and task data via userService and taskService before calling commentService). This violates rule #1 — inter-service data enrichment is happening via direct cross-service calls in the router rather than through events. The router is the HTTP entry point (rule #3 satisfied), and each service has its own file and data store. Completeness: All CRUD operations are implemented for all five services. The demo script exercises all major flows. However, the comment.added notification incorrectly notifies the comment *author* instead of the task assignee or project members — the notification service explicitly acknowledges this as a design limitation and works around it incorrectly. The task.statusChanged event fires even when oldStatus === newStatus (same-status 'transition' is allowed), which is a logic flaw. The status transition allows todo→done directly, which contradicts the strict forward-only sequential rule. No 'unread notification count' or delete-notification endpoint, though these weren't strictly required. Code quality: Code is generally clean and well-typed. Error handling is reasonable. The router enrichment pattern (fetching user/task in the comment route) is a design smell. The comment on notification-service acknowledging the architectural compromise is honest but the wrong fix was chosen. The DELETE /projects/:id/members route sends a body, which is non-standard HTTP. The 204 response still calls res.end(JSON.stringify(null)) which sends 'null' as body, violating the 204 No Content spec. Constraint compliance: Rule #1 violated — router performs cross-service data reads to enrich comment creation. Rule #4 partially violated — todo→done direct transition is allowed. Rule #5 satisfied (no npm deps). Rule #6 satisfied. Rules #2 and #3 are satisfied.

#### openapi-3
- Files: 5, Lines: 323
- Compiles: NO
- Constraint violations: 0
- Tokens: 38816 (in: 36448, out: 2368)
- Tool calls: 5, Errors: 0, Retries: 0
- Structure score: 4/10
- Judge: arch=7 comp=4 quality=7 constraints=7 overall=6.25
- Judge notes: Architectural adherence is solid for what's shown: EventBus uses pub/sub correctly with setImmediate for async decoupling, services own their data stores, and TaskService properly communicates via EventBus rather than direct calls. However, the review is incomplete — only 5 of the required 6 files are shown (CommentService, NotificationService, and ApiRouter are entirely missing), which severely impacts completeness. Completeness scores low (4) because: CommentService (create/get/delete comments) is absent, NotificationService (in-memory, subscribing to task.assigned, task.statusChanged, comment.added) is absent, ApiRouter (HTTP entry point using Node.js http module) is absent, and no demo/index script is present. The 'comment.added' event is never published since CommentService is missing. Code quality is reasonable: TypeScript interfaces are well-defined in models.ts, async/await is used consistently, the forward-only status transition logic is correct and clean, UUID generation uses built-in crypto, and the union return type 'Task | undefined | invalid_transition' is functional but a thrown error or discriminated union would be more idiomatic. Minor issues: ProjectService does not validate that userId exists before adding as member (cross-service validation would require event-based query pattern or relaxed rule), the seeded default user in UserService is unexpected and untestable. ConstraintCompliance: no external npm dependencies visible, services are in separate files, EventBus is used for inter-service events, forward-only transitions are enforced — but cannot fully verify rule 3 (all HTTP handling in router only) or rule 1 (no direct service-to-service calls) since ApiRouter is missing. Score reflects partial compliance based on visible code.

### Condition: prose

#### prose-1
- Files: 6, Lines: 447
- Compiles: NO
- Constraint violations: 1
  - [external-dependency] src\projectService.ts:3 — Uses external package: uuid
- Tokens: 31036 (in: 27200, out: 3836)
- Tool calls: 6, Errors: 0, Retries: 0
- Structure score: 5/10
- Judge: arch=5 comp=4 quality=6 constraints=4 overall=4.75
- Judge notes: Several significant issues found: (1) CONSTRAINT VIOLATION - projectService.ts has 'import { v4 as uuidv4 } from uuid' (an external npm dependency) even though it's commented as a placeholder and a local function is used instead — the import itself is a violation and would cause a runtime error. (2) MISSING COMPONENTS - No API Router (HTTP entry point using Node.js built-in http module) is provided, which is a core architectural requirement. (3) MISSING SERVICE - NotificationService is entirely absent; no in-memory notification handling for task.assigned, task.statusChanged, or comment.added events. (4) ARCHITECTURAL VIOLATION - The spec says services should communicate only via EventBus, but the API Router (missing) would need to call services directly, and there are no cross-service event subscriptions shown (e.g., TaskService does not validate that a projectId exists, UserService not consulted for assigneeId — acceptable via event bus design, but Notification subscriptions are absent entirely). (5) Comment type uses 'text' field but spec says 'body' — type mismatch with spec. (6) TaskAssignedEvent has assigneeId typed as string but task.assigneeId is string|null — type inconsistency. (7) Status transition logic uses pairwise checks rather than an ordered array/map, which is functional but fragile. (8) ProjectService seeds data in constructor using its own createProject method, creating coupling to initialization order. (9) No demo/index script is present. (10) UserService has no EventBus dependency at all — fine per spec, but createUser accepts a full User (including id) rather than generating one. (11) memberIds serialized as Set will break JSON.stringify without custom handling in the missing router. Overall, the partial implementation shows reasonable TypeScript patterns but is missing ~40% of required components and has a rule-breaking import statement.

#### prose-2
- Files: 6, Lines: 346
- Compiles: NO
- Constraint violations: 0
- Tokens: 24474 (in: 21903, out: 2571)
- Tool calls: 6, Errors: 0, Retries: 0
- Structure score: 5/10
- Judge: arch=6 comp=4 quality=7 constraints=6 overall=5.75
- Judge notes: Architectural adherence: EventBus, UserService, ProjectService, TaskService, CommentService are properly separated into individual files with correct ownership of data stores. EventBus pub/sub is used correctly for task.assigned, task.statusChanged, and comment.added. However, NotificationService is entirely missing — it is neither implemented nor subscribed to any events, which is a core architectural requirement. ProjectService makes no use of the EventBus at all, with no validation that userIds actually exist (acceptable under rule #1, but no cross-service event for member changes either). Completeness: NotificationService is completely absent. The API Router (HTTP entry point using Node.js built-in http module) is entirely missing — this is a critical omission since it is listed as a required component. The Comment type uses 'text' instead of 'body' as specified. TaskAssignedEvent types assigneeId as string but the task allows null, creating a type mismatch. No demo/entry script is present. Status transition logic correctly blocks todo→done and backward transitions but the same-status early return (returning task without error) may cause ambiguity for callers. CodeQuality: TypeScript usage is generally clean and idiomatic. Use of Map for data stores is appropriate. UUID generation via crypto is correct per no-external-deps rule. Error handling in EventBus subscriber loop is good. Mutation of stored objects directly (e.g., project.name = name) without cloning could cause referential aliasing issues. Seeding in UserService constructor is a minor design smell. ConstraintCompliance: Rule 1 (no direct service-to-service calls) — appears satisfied in what is shown. Rule 2 (each service owns its data store) — satisfied. Rule 3 (HTTP handling only in API Router) — API Router is missing entirely, so this cannot be verified. Rule 4 (forward-only transitions) — satisfied. Rule 5 (no external npm deps) — satisfied. Rule 6 (each service in its own file) — satisfied for implemented services, but NotificationService file is absent.

#### prose-3
- Files: 11, Lines: 1024
- Compiles: NO
- Constraint violations: 0
- Tokens: 426924 (in: 407813, out: 19111)
- Tool calls: 31, Errors: 3, Retries: 0
- Structure score: 10/10
- Judge: arch=7 comp=7 quality=7 constraints=6 overall=6.75
- Judge notes: ARCHITECTURAL ADHERENCE (7/10): Event bus is properly implemented with pub/sub pattern. Services own their data stores exclusively. API router correctly delegates to services. However, NotificationService maintains a private taskAssigneeMap to track assignees — this is a subtle data ownership violation since that data belongs to TaskService. The notification service is essentially duplicating task state to compensate for not being able to call TaskService directly, which is acceptable as a workaround but the map gets populated only via events so it will miss tasks created before subscription or seeded tasks whose assignment events fire before the notification service subscribes (ordering issue in constructor). The API router holds direct references to all services, which is correct per spec. COMPLETENESS (7/10): All five services are implemented. CRUD for users, projects, tasks, comments is present. Event bus covers task.assigned, task.statusChanged, comment.added, and project.memberAdded. Demo script exists. Gaps: Comment spec says field is 'body' but implementation uses 'text' — mismatch with spec. The Comment type uses 'text' not 'body' as specified. Notification spec requires task.assigned, task.statusChanged, comment.added but the router validation for POST /comments checks for 'text' while the API input also says 'text' — consistent internally but wrong vs spec. The POST /projects/:id/members and DELETE /projects/:id/members routes are unreachable because the method===POST branch is checked first and falls through to a generic POST handler before the members sub-routes are evaluated (dead code bug — the POST members/DELETE members checks are inside an else-if chain that is never reached for POST/DELETE because those methods are handled earlier). Forward-only status transition implementation is mostly correct but uses explicit conditionals rather than an ordered array, and allows todo->in-progress and in-progress->done correctly. No updateTask route properly prevents status/projectId field overwriting. CODE QUALITY (7/10): TypeScript types are well-defined in types.ts. Nominal typing via branded types is used. Error handling in event bus handlers catches errors. Utils are cleanly separated. Some issues: .js extensions on imports in some files (event-bus.js) but not others — inconsistent and would cause issues in a standard ts-node setup. The 'any' type is used in EventPayload definition undermining type safety. Seeded data in constructors references hardcoded IDs (user1, project1) that don't exist and will generate dangling references. parseRequestBody always parses even for GET requests unnecessarily. The sendJsonResponse with 204 sends a body ({}) which violates HTTP spec — 204 No Content must have no body. CONSTRAINT COMPLIANCE (6/10): Constraint 1 (no direct service-to-service calls) — mostly satisfied but NotificationService maintains its own taskAssigneeMap as a workaround; borderline acceptable. Constraint 2 (each service owns its data) — violated subtly by the taskAssigneeMap duplication. Constraint 3 (HTTP handling in router only) — satisfied. Constraint 4 (forward-only transitions) — satisfied. Constraint 5 (no external npm dependencies) — satisfied, uses only Node.js built-ins. Constraint 6 (each service in own file) — satisfied. Additional: The POST /projects/:id/members route is a dead code bug making member management partially non-functional via HTTP, which is a significant completeness/correctness issue. The 204 response with body is an HTTP protocol violation.

### Condition: structured

#### structured-1
- Files: 5, Lines: 272
- Compiles: NO
- Constraint violations: 0
- Tokens: 23893 (in: 21776, out: 2117)
- Tool calls: 5, Errors: 0, Retries: 0
- Structure score: 5/10
- Judge: arch=6 comp=4 quality=7 constraints=6 overall=5.75
- Judge notes: architecturalAdherence: Event bus is properly implemented and used by TaskService and CommentService. ProjectService correctly has no event bus dependency. However, the API Router is entirely missing, which is a core architectural component. NotificationService is also missing, so there is no subscriber consuming task.assigned, task.statusChanged, or comment.added events — the pub/sub pipeline is half-built. Rule 1 (no direct service-to-service calls) appears respected in what exists, but CommentService.create() accepts taskTitle and authorName as parameters, which implies the caller (API Router) must fetch these from other services before calling — this pushes cross-service coordination into the router, which is borderline acceptable but indicates the design forces the router to act as an orchestrator rather than a thin HTTP layer. completeness: UserService, ProjectService, TaskService, and CommentService are present with CRUD. NotificationService is completely absent. API Router is completely absent. No demo/index script. Event subscriptions are never wired up. getByProject on TaskService exists but there is no equivalent index on CommentService beyond getByTask. No unsubscribe usage anywhere. codeQuality: Code is clean and readable. TypeScript types are used appropriately. Error handling in EventBus publish is good (try/catch per handler). TaskService changeStatus silently returns undefined on invalid transition with only a console.warn — should return a typed error or throw. update() methods accept only positional full-field replacements with no partial update support (minor). nextId as a plain number is not collision-safe across restarts but acceptable for in-memory. constraintCompliance: Rule 3 violated — API Router is missing entirely. Rule 6 violated — NotificationService is missing its own file. Rule 4 (forward-only transitions) is correctly implemented. Rule 5 (no external npm deps) appears respected. Rule 2 (each service owns its data) is respected. Rule 1 appears respected. Two of six rules have clear violations due to missing components.

#### structured-2
- Files: 9, Lines: 820
- Compiles: NO
- Constraint violations: 0
- Tokens: 354172 (in: 343107, out: 11065)
- Tool calls: 23, Errors: 4, Retries: 0
- Structure score: 10/10
- Judge: arch=6 comp=8 quality=7 constraints=6 overall=6.75
- Judge notes: Completeness is solid: all five services exist, full CRUD is implemented, event bus pub/sub works, all three events (task.assigned, task.statusChanged, comment.added) are fired, forward-only status transitions are enforced, and a working demo script is included. However, several architectural and constraint issues drag the scores down. (1) Rule 1 violation – the router directly calls this.userService.getById() and this.taskService.getById() inside the comment-creation handler to gather data (taskTitle, authorName, taskAssigneeId) that is then passed as extra parameters into CommentService.create(). This is cross-service orchestration performed in the router layer to work around the no-direct-service-calls rule, but it also means the CommentService method signature is polluted with data it does not own (taskTitle, authorName, taskAssigneeId), leaking domain knowledge across service boundaries. (2) Rule 1 violation – the router calls this.userService.getById() inside the task-assignment handler to validate the assignee before calling TaskService.assign(). Services should not depend on each other's data even through the router as an intermediary for business logic. (3) Rule 2 violation – TaskService and CommentService import and use the eventBus singleton directly rather than receiving it via constructor injection like NotificationService does; this is inconsistent and makes the services harder to test. More importantly, the router reaching into multiple services to assemble a payload for another service is a form of implicit coupling. (4) Rule 3 is mostly respected but borderline: the router performs non-trivial business validation (assignee existence, project existence) that arguably belongs in the services. (5) The addMember method returns undefined both when the project doesn't exist AND when the user is already a member, making it impossible for the router to distinguish these two cases – the error message 'Project not found or user already a member' confirms this ambiguity. (6) DELETE /projects/:id/members uses a request body, which is non-standard and fragile. (7) The NotificationService constructor parameter type is typed as typeof eventBus (a singleton instance type) rather than a proper interface or class type, which is fragile. (8) status transition rejection returns undefined conflated with 'task not found', so the router always returns a generic 400 instead of distinguishing the two cases. (9) GET /tasks requires projectId query param, making it impossible to fetch a task list without a project context. (10) No email uniqueness validation in UserService. Overall the implementation is functional and demonstrates good understanding, but the cross-service data plumbing through the router and the singleton event-bus imports in services represent real architectural violations.

#### structured-3
- Files: 5, Lines: 446
- Compiles: NO
- Constraint violations: 0
- Tokens: 31062 (in: 27350, out: 3712)
- Tool calls: 5, Errors: 0, Retries: 0
- Structure score: 5/10
- Judge: arch=6 comp=4 quality=7 constraints=5 overall=5.5
- Judge notes: architecturalAdherence: Event bus is properly implemented as a singleton pub/sub with error isolation. Services correctly own their own data stores. However, the CommentService violates Rule 1 by accepting taskTitle and authorName as direct parameters — this means the API Router must fetch data from UserService and TaskService before calling CommentService, creating implicit cross-service coupling through the router rather than via events. Similarly, the NotificationService is entirely missing, so the event subscriptions (task.assigned, task.statusChanged, comment.added) are published but never consumed. The router is not shown but is referenced as the HTTP entry point. completeness: NotificationService is completely absent — a major gap. The API Router is missing entirely from the submission, which is a critical component. No demo/entry-point script is present. ProjectService does not validate that memberIds reference real users (acceptable per rule 1, but worth noting). CommentService is missing a getAll or list endpoint. Task status validation is implemented. All basic CRUD operations exist across the visible services. codeQuality: Code is clean, consistently structured, and well-documented with JSDoc. TypeScript interfaces are properly defined. Use of Map for data stores is appropriate. Error handling in the event bus with try/catch is good practice. The TaskStatus type is properly typed. Minor issue: the 'any' type is used in EventCallback and EventBus.publish which weakens type safety. The createdAt field uses number (Unix ms) which is fine but could use Date. constraintCompliance: Rule 1 (no direct service-to-service calls) is partially violated — CommentService requires callers to resolve cross-service data (taskTitle, authorName) externally, pushing coupling into the router. Rule 2 (each service owns its data) is respected. Rule 3 (HTTP handling only in router) cannot be verified — router not submitted. Rule 4 (forward-only transitions) is correctly implemented. Rule 5 (no external npm deps) appears respected. Rule 6 (each service in own file) is respected. Missing NotificationService means event infrastructure is incomplete.

### Condition: typescript-contracts

#### typescript-contracts-1
- Files: 10, Lines: 1152
- Compiles: NO
- Constraint violations: 0
- Tokens: 596771 (in: 572777, out: 23994)
- Tool calls: 29, Errors: 3, Retries: 0
- Structure score: 10/10
- Judge: arch=7 comp=8 quality=8 constraints=7 overall=7.5
- Judge notes: Overall a solid implementation with clear structure. Issues found: (1) ARCHITECTURAL VIOLATION - main.ts acts as an orchestrator by subscribing to 'comment.created.raw' and directly calling taskService.getById() and userService.getById() to enrich events before notifying. This is effectively a direct service-to-service call mediated through main.ts, violating Rule 1's spirit - services should communicate only via the event bus without a manual broker. The comment event payload design (publishing 'raw' then re-enriching in main) is a workaround that leaks cross-service concerns into the bootstrap file. (2) The event bus wiring in main.ts means NotificationService never directly subscribes to the bus - all notification creation is orchestrated imperatively in main.ts, which partially violates Rule 2 (NotificationService's data creation is triggered outside its own boundary via main.ts logic). (3) Router parameter extraction is fragile - uses string path.includes() checks to reclassify params.id into domain-specific keys, which is error-prone and could misfire (e.g., a task with 'members' in its UUID path). (4) GET /tasks requires projectId query param - no way to get all tasks, which is a minor completeness gap. (5) handleGetTasks returns 400 instead of empty array when no projectId provided - debatable design. (6) No validation that assigneeId or projectId actually exist in their respective services (no referential integrity). (7) Comment body field name collision (comment.body vs request body.body) is handled correctly but is fragile. (8) url.parse is deprecated in favor of URL constructor. (9) handleRemoveProjectMember uses DELETE with a body, which is unconventional. (10) Types are well-defined, interfaces are clean, error handling is consistent. Demo script is comprehensive and tests happy/sad paths. No external npm dependencies used. Forward-only status transitions correctly implemented.

#### typescript-contracts-2
- Files: 10, Lines: 987
- Compiles: NO
- Constraint violations: 0
- Tokens: 348807 (in: 334444, out: 14363)
- Tool calls: 23, Errors: 3, Retries: 0
- Structure score: 10/10
- Judge: arch=5 comp=8 quality=7 constraints=5 overall=6.25
- Judge notes: Completeness is solid: all five services are implemented with full CRUD, status transitions, event payloads, and a working demo script. Code quality is generally good — strong TypeScript typing via interfaces, unsubscribe pattern on EventBus, clean error propagation, and idiomatic Map usage. However, several significant violations drag down the other scores. (1) Architectural Rule 1 broken twice: CommentService and NotificationService both receive a direct TaskService reference (ITaskServiceForComments / ITaskServiceForNotifications) and call getById() on it synchronously inside event handlers and create(). This is explicit service-to-service coupling, not event-driven communication. CommentService should validate task existence only through the event it is reacting to, or the payload should carry enough context. NotificationService fetching task title via taskService.getById() inside handleCommentAdded is the same violation. (2) Rule 3 is borderline clean but acceptable — all HTTP handling is in the router. (3) The NotificationService receives IUserService directly in its constructor and calls getById() on it (handleTaskAssigned, handleTaskStatusChanged, handleCommentAdded). This is another direct service-to-service call that bypasses the event bus. The assignee variable is even fetched but never used in handleTaskAssigned and handleTaskStatusChanged (dead code / unused variable). (4) Seeded data in UserService, ProjectService, and TaskService uses hardcoded 'project1' string as a projectId in task seeds, which is a dangling reference and would cause confusion. (5) Error status code logic in the router is a naive string-contains check ('not found') rather than a proper typed error hierarchy. (6) DELETE /projects/:id/members passes userId in the request body, which is non-standard for REST but not a hard constraint violation. (7) GET /tasks requires projectId, making it impossible to list all tasks globally — minor design limitation. Overall the event bus exists and is used for publishing, but consumption re-introduces direct coupling, which is the core architectural rule being violated.

#### typescript-contracts-3
- Files: 10, Lines: 972
- Compiles: NO
- Constraint violations: 0
- Tokens: 353149 (in: 340511, out: 12638)
- Tool calls: 23, Errors: 4, Retries: 0
- Structure score: 10/10
- Judge: arch=5 comp=8 quality=7 constraints=5 overall=6.25
- Judge notes: Completeness is strong: all five services are implemented, full CRUD is present for users/projects/tasks, events (task.assigned, task.statusChanged, comment.added) are published and consumed, and a working demo script exists. Code quality is generally good — clean TypeScript, proper interfaces in types.ts, immutable-style updates, consistent error messages, and a tidy regex-based router. However, several architectural and constraint violations drag scores down significantly. (1) Rule 1 (no direct service-to-service calls) is violated twice: CommentService receives IUserService and ITaskService via constructor injection and calls them directly (getById) to build the event payload, and NotificationService similarly holds ITaskService and calls getById inside an event handler. Even though interfaces are used instead of concrete imports, injecting one service into another and calling it synchronously is a direct service-to-service call — the event bus is supposed to carry all necessary data in its payload, making cross-service lookups unnecessary. The TaskService event payloads already include taskTitle, so the CommentService lookup of taskTitle is particularly redundant. (2) Rule 3 (all HTTP handling in API Router only) is partially violated: parseBody is called inside individual route handlers (after already being called in handleRequest — the result is actually discarded in handleRequest because body is parsed but not passed to the handler, causing a double-parse bug). The parseBody invocation in the catch block of handleRequest parses the body a second time inside each handler callback, which is wasteful and inconsistent. (3) The router's handleRequest parses the body but never passes it to the route handler; each handler re-parses independently — this means the body stream is consumed twice, which will silently fail on the second read in Node.js (the second parse will usually resolve with an empty object because the stream is already exhausted). This is a real functional bug. (4) Error classification in handleRequest is string-matching based ('not found', 'Invalid', 'cannot change task from'), which is fragile. (5) GET /tasks requires a projectId query param, meaning you cannot retrieve a single task list without a project — but GET /tasks/:id still works, so it is an opinionated but functional design choice. (6) No input validation (missing required fields, invalid email format, duplicate emails, etc.). (7) NotificationService calls taskService.getById inside an event handler, violating rule 1 again — the comment.added payload already contains taskId and taskTitle, and the assigneeId could be included in the payload by TaskService or CommentService at publish time rather than fetched live. Overall the architecture is recognizable and mostly correct, but the cross-service injection pattern is a clear rule-1 violation and the double-parse bug is a real correctness issue.

## Constraint Violation Breakdown

| Type | c4 | openapi | prose | structured | typescript-contracts |
|------| --- | --- | --- | --- | --- |
| directServiceCalls | 0 | 0 | 0 | 0 | 0 |
| sharedDataAccess | 0 | 0 | 0 | 0 | 0 |
| httpInServices | 0 | 0 | 0 | 0 | 0 |
| invalidStatusTransitions | 0 | 0 | 0 | 0 | 0 |
| externalDependencies | 0 | 0 | 1 | 0 | 0 |
