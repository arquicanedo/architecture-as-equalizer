# Task Management API

A TypeScript-based Task Management System built with Node.js built-in modules and an in-memory event-driven architecture.

## Architecture Overview

This system implements a C4 Model architecture with the following key components:

### Core Components

1. **Event Bus** (`src/event-bus.ts`)
   - In-memory pub/sub message broker
   - Enables decoupled communication between services
   - Publishes: `task.assigned`, `task.statusChanged`, `comment.added`

2. **Services** (in `src/services/`)
   - **User Service**: CRUD operations for users
   - **Project Service**: Project management and membership
   - **Task Service**: Task management with status transitions (todo → in-progress → done)
   - **Comment Service**: Comments on tasks
   - **Notification Service**: Event-driven notifications

3. **API Router** (`src/router.ts`)
   - Single HTTP entry point using Node.js `http` module
   - Delegates requests to services
   - RESTful endpoints for all operations

4. **Main Entry Point** (`src/main.ts`)
   - Starts the HTTP server on port 3000

### Architectural Principles

✓ **No Direct Service-to-Service Calls**: All inter-service communication goes through the Event Bus
✓ **Service-Owned Data**: Each service exclusively owns its data store (in-memory Map)
✓ **Single Entry Point**: All HTTP handling in API Router
✓ **Forward-Only Status Transitions**: Tasks can only transition todo → in-progress → done
✓ **No External Dependencies**: Only Node.js built-in modules (dev tools like tsx/typescript are separate)

## Data Models

### User
```typescript
{
  id: string;          // UUID
  name: string;
  email: string;
}
```

### Project
```typescript
{
  id: string;          // UUID
  name: string;
  description: string;
  memberIds: string[]; // Array of user IDs
}
```

### Task
```typescript
{
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  assigneeId: string | null;
  projectId: string;
}
```

### Comment
```typescript
{
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}
```

### Notification
```typescript
{
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}
```

## API Routes

### Users
- `GET /users` - Get all users
- `POST /users` - Create user
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Projects
- `GET /projects` - Get all projects
- `POST /projects` - Create project
- `GET /projects/:id` - Get project by ID
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `POST /projects/:id/members` - Add member
- `DELETE /projects/:id/members` - Remove member

### Tasks
- `GET /tasks?projectId=X` - Get tasks by project
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/status` - Change task status
- `PUT /tasks/:id/assign` - Assign task to user

### Comments
- `GET /comments?taskId=X` - Get comments by task
- `POST /comments` - Create comment
- `GET /comments/:id` - Get comment by ID
- `DELETE /comments/:id` - Delete comment

### Notifications
- `GET /notifications?userId=X` - Get notifications by user
- `PUT /notifications/:id/read` - Mark notification as read

## Running the Application

### Start the Server
```bash
npx tsx src/main.ts
```

The server will listen on port 3000 (or PORT environment variable).

### Run the Demo
```bash
npx tsx src/demo.ts
```

The demo script:
1. Creates 3 users (Alice, Bob, Charlie)
2. Creates a project and adds members
3. Creates tasks in the project
4. Assigns tasks to users
5. Changes task statuses
6. Adds comments
7. Verifies notifications were created
8. Marks notifications as read

### Compile TypeScript
```bash
npx tsc --noEmit
```

## Event Flow

### Task Assignment Event
```
TaskService.assign() 
  → publishes 'task.assigned' 
  → NotificationService receives event 
  → creates notification for assignee
```

### Status Change Event
```
TaskService.changeStatus() 
  → publishes 'task.statusChanged' 
  → NotificationService receives event 
  → creates notification for assignee
```

### Comment Event
```
CommentService.create() 
  → publishes 'comment.added' 
  → NotificationService receives event 
  → (future: could notify task assignee)
```

## File Structure

```
src/
├── event-bus.ts                 # In-memory pub/sub broker
├── main.ts                      # HTTP server entry point
├── router.ts                    # API routing and request handling
├── demo.ts                      # End-to-end demo script
└── services/
    ├── user-service.ts
    ├── project-service.ts
    ├── task-service.ts
    ├── comment-service.ts
    └── notification-service.ts
```

## Design Decisions

### ADR-001: Event Bus over Direct Calls
**Decision**: Use in-memory pub/sub for inter-service communication
**Rationale**: Keeps services decoupled; adding new subscribers requires zero changes to existing code
**Tradeoff**: Execution flow harder to trace; no compile-time guarantee of subscribers

### ADR-002: Service-Owned Data Stores
**Decision**: Each service maintains its own in-memory Map
**Rationale**: Prevents shared-state bugs; full control over data invariants
**Tradeoff**: Cross-service queries need coordination through router

### ADR-003: No External Frameworks
**Decision**: Use Node.js built-in `http` module only
**Rationale**: Self-contained with zero setup complexity
**Tradeoff**: More boilerplate for request parsing and routing

## Status Transition Rules

Tasks follow strict forward-only transitions:
- `todo` → `in-progress` (allowed)
- `in-progress` → `done` (allowed)
- Any backward transition → Error
- Skipping states → Error (e.g., `todo` → `done`)

## Development Notes

- All data is in-memory (lost on server restart)
- No database required
- No npm dependencies for the core application
- TypeScript with strict mode enabled
- Fully tested with demo script
