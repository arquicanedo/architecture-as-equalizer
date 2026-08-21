# Task Management API

A TypeScript-based Task Management API with an event-driven architecture using in-memory data stores.

## Architecture

The system follows a microservices-like architecture with the following components:

- **Event Bus**: In-memory publish/subscribe system for inter-service communication
- **User Service**: Manages user data
- **Project Service**: Manages projects and project members
- **Task Service**: Manages tasks with status transitions (todo → in-progress → done)
- **Comment Service**: Manages comments on tasks
- **Notification Service**: Manages user notifications triggered by events
- **API Router**: HTTP request handler using Node.js built-in `http` module

## Key Architectural Principles

1. **Event-Driven Communication**: Services communicate through an Event Bus, not direct calls
2. **Service Isolation**: Each service owns its data store exclusively
3. **No External Dependencies**: Uses only Node.js built-in modules for the application
4. **In-Memory Storage**: All data is stored in memory using Maps

## Project Structure

```
src/
├── event-bus.ts                    # Event Bus implementation
├── services/
│   ├── user-service.ts             # User management
│   ├── project-service.ts          # Project management
│   ├── task-service.ts             # Task management
│   ├── comment-service.ts          # Comment management
│   └── notification-service.ts     # Notification management
├── router.ts                        # API Router (HTTP handler)
├── main.ts                          # Server entry point
└── demo.ts                          # Demo script
```

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
# or
npx tsx src/main.ts
```

The server listens on port 3000 (or the PORT environment variable).

## Running the Demo

```bash
npm run demo
# or
npx tsx src/demo.ts
```

The demo script:
1. Creates users (Alice, Bob, Charlie)
2. Creates a project
3. Adds members to the project
4. Creates tasks
5. Assigns tasks to users (triggers notifications)
6. Changes task status (triggers notifications)
7. Adds comments to tasks (triggers notifications)
8. Retrieves and displays all data

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
- `POST /projects/:id/members` - Add member to project
- `DELETE /projects/:id/members` - Remove member from project

### Tasks
- `GET /tasks?projectId=X` - Get tasks (optionally filtered by project)
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/status` - Change task status
- `PUT /tasks/:id/assign` - Assign task to user

### Comments
- `GET /comments?taskId=X` - Get comments on task
- `POST /comments` - Create comment
- `GET /comments/:id` - Get comment by ID
- `DELETE /comments/:id` - Delete comment

### Notifications
- `GET /notifications?userId=X` - Get user's notifications
- `PUT /notifications/:id/read` - Mark notification as read

## Events

### Event Bus Events

- **task.assigned**: Triggered when a task is assigned to a user
  - Payload: `{ taskId, taskTitle, assigneeId }`
  - Listener: Notification Service (creates notification for assignee)

- **task.statusChanged**: Triggered when a task status changes
  - Payload: `{ taskId, taskTitle, assigneeId, oldStatus, newStatus }`
  - Listener: Notification Service (creates notification for assignee)

- **comment.added**: Triggered when a comment is added
  - Payload: `{ commentId, taskId, taskTitle, authorId, authorName }`
  - Listener: Notification Service (would create notification for task assignee)

## Data Models

### User
```typescript
{
  id: string;
  name: string;
  email: string;
}
```

### Project
```typescript
{
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}
```

### Task
```typescript
{
  id: string;
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
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}
```

### Notification
```typescript
{
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
```

## Type Checking

```bash
npm run typecheck
# or
npx tsc --noEmit
```

## Building

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

## Design Decisions

1. **Event Bus Pattern**: Allows services to remain decoupled and makes the system extensible
2. **In-Memory Storage**: Simplifies the implementation for this architectural demonstration
3. **No Framework**: Uses only Node.js built-in modules to keep the system lightweight
4. **Forward-Only Status Transitions**: Tasks can only move forward in status (todo → in-progress → done)
5. **Service-to-Service via Events**: The Notification Service subscribes to events and creates notifications automatically

## Notes

- All data is lost when the server restarts (in-memory storage)
- UUIDs are generated for all entity IDs
- Timestamps are used for notifications and comments
- The router uses a custom pattern matching system for routing
- Request bodies are expected to be JSON
