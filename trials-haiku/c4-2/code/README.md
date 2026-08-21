# Task Management API — C4 Architecture Implementation

A TypeScript-based Task Management API implementing the C4 Architecture model with clean separation of concerns.

## Architecture Overview

The system implements a **container-based architecture** with the following key components:

### Containers

1. **API Router** — HTTP entry point using Node.js `http` module
2. **Event Bus** — In-memory pub/sub message broker for inter-service communication
3. **User Service** — Manages user CRUD operations
4. **Project Service** — Manages projects and team membership
5. **Task Service** — Manages tasks with enforced status transitions
6. **Comment Service** — Manages task comments
7. **Notification Service** — Reacts to events and creates notifications

### Key Architectural Constraints

- **No Direct Service-to-Service Calls** — All inter-service communication through Event Bus
- **Service-Owned Data Stores** — Each service exclusively owns its in-memory data
- **Single Entry Point** — All HTTP handling in the API Router
- **Forward-Only Status Transitions** — Task status: `todo → in-progress → done`
- **Node.js Only** — No external dependencies for application code

## Project Structure

```
src/
├── event-bus.ts              # In-memory pub/sub broker
├── router.ts                 # HTTP router
├── main.ts                   # Server entry point
├── demo.ts                   # Integration test/demo
└── services/
    ├── user-service.ts       # User management
    ├── project-service.ts    # Project management
    ├── task-service.ts       # Task management
    ├── comment-service.ts    # Comment management
    └── notification-service.ts  # Notification management
```

## API Routes

### Users
- `GET /users` — List all users
- `POST /users` — Create user
- `GET /users/:id` — Get user by ID
- `PUT /users/:id` — Update user
- `DELETE /users/:id` — Delete user

### Projects
- `GET /projects` — List all projects
- `POST /projects` — Create project
- `GET /projects/:id` — Get project by ID
- `PUT /projects/:id` — Update project
- `DELETE /projects/:id` — Delete project
- `POST /projects/:id/members` — Add project member
- `DELETE /projects/:id/members` — Remove project member

### Tasks
- `GET /tasks?projectId=X` — List tasks by project
- `POST /tasks` — Create task
- `GET /tasks/:id` — Get task by ID
- `PUT /tasks/:id` — Update task
- `DELETE /tasks/:id` — Delete task
- `PUT /tasks/:id/status` — Change task status
- `PUT /tasks/:id/assign` — Assign task to user

### Comments
- `GET /comments?taskId=X` — List comments by task
- `POST /comments` — Create comment
- `GET /comments/:id` — Get comment by ID
- `DELETE /comments/:id` — Delete comment

### Notifications
- `GET /notifications?userId=X` — List notifications for user
- `PUT /notifications/:id/read` — Mark notification as read

## Data Models

### User
```typescript
{
  id: string;        // UUID
  name: string;
  email: string;
}
```

### Project
```typescript
{
  id: string;        // UUID
  name: string;
  description: string;
  memberIds: string[];
}
```

### Task
```typescript
{
  id: string;        // UUID
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  assigneeId: string | null;
  projectId: string;
}
```

### Comment
```typescript
{
  id: string;        // UUID
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}
```

### Notification
```typescript
{
  id: string;        // UUID
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}
```

## Events Published

### Task Service
- `task.assigned` → `{ taskId, taskTitle, assigneeId }`
- `task.statusChanged` → `{ taskId, taskTitle, assigneeId, oldStatus, newStatus }`

### Comment Service
- `comment.added` → `{ commentId, taskId, taskTitle, authorId, authorName }`

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Running the Server

```bash
npm start
```

Server listens on port 3000 (configurable via `PORT` environment variable).

### Running the Demo

```bash
npm run demo
```

Runs a complete integration test exercising all major features:
1. Creates sample users
2. Creates a project
3. Adds members to the project
4. Creates tasks
5. Assigns tasks (triggers notifications)
6. Updates task status
7. Adds comments
8. Retrieves all data
9. Marks notifications as read

### Type Checking

```bash
npm run type-check
```

## Event Flow Example

```
User creates comment
    ↓
Router validates task exists
    ↓
Comment Service creates comment
    ↓
Publishes "comment.added" event
    ↓
Notification Service subscribes to event
    ↓
Creates notification for task assignee
```

## Design Decisions

### ADR-001: Event Bus over Direct Calls
**Decision:** Use in-memory pub/sub for inter-service communication  
**Rationale:** Keeps services decoupled and allows new subscribers without changing existing code  
**Tradeoff:** Harder to trace execution flow than direct calls

### ADR-002: Service-Owned Data Stores
**Decision:** Each service maintains its own in-memory Map  
**Rationale:** Prevents shared-state bugs and gives each service full control  
**Tradeoff:** Cross-service queries require router coordination

### ADR-003: No External Frameworks
**Decision:** Use only Node.js built-in modules  
**Rationale:** Self-contained system with zero production dependencies  
**Tradeoff:** More boilerplate for HTTP parsing and routing

## Limitations

- **In-Memory Storage** — All data is lost on server restart
- **No Persistence** — No database integration
- **Single Process** — No clustering or distribution
- **No Authentication** — No user auth/authorization
- **No Rate Limiting** — No built-in throttling
- **Synchronous Events** — Events are processed synchronously

## Future Enhancements

- [ ] Database persistence (PostgreSQL, MongoDB, etc.)
- [ ] User authentication and authorization
- [ ] WebSocket support for real-time notifications
- [ ] Request validation schemas
- [ ] OpenAPI/Swagger documentation
- [ ] Async event processing with queues
- [ ] Service discovery and clustering
- [ ] Comprehensive error handling
- [ ] Structured logging
- [ ] Performance monitoring

## License

MIT
