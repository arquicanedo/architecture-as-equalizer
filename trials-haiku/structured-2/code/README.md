# Task Management API

A TypeScript-based Task Management API demonstrating clean architectural patterns with decoupled services using an event-driven architecture.

## Architecture

```
┌─────────────┐
│ HTTP Client │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  API Router     │ (HTTP entry point)
└────┬────┬───┬──┴──────┐
     │    │   │         │
     ▼    ▼   ▼         ▼
   Users Projects Tasks Comments
              ▲
              │
   Events from: Task, Comment services
              │
              ▼
         ┌──────────┐
         │EventBus  │
         └──────┬───┘
                │
                ▼
         Notifications Service
```

## Key Design Principles

1. **Service Isolation**: Each service owns its data and operations exclusively
2. **Event-Driven**: Inter-service communication via publish/subscribe event bus
3. **No Direct Coupling**: Services never import or call other services directly
4. **Single Responsibility**: Each service handles one domain (users, projects, tasks, comments, notifications)
5. **Node.js Built-ins Only**: Uses only Node.js standard library (http, url, etc.)

## Project Structure

```
src/
├── event-bus.ts                 # Pub/Sub event system
├── services/
│   ├── user-service.ts         # User CRUD operations
│   ├── project-service.ts       # Project & member management
│   ├── task-service.ts          # Task CRUD & status management
│   ├── comment-service.ts       # Task comments
│   └── notification-service.ts  # Event-driven notifications
├── router.ts                    # HTTP request routing
├── main.ts                      # Server startup & wiring
└── demo.ts                      # End-to-end demo script
```

## Installation

```bash
npm install
```

## Running the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Running the Demo

The demo exercises all features:
- Create users and projects
- Add project members
- Create and assign tasks
- Change task status
- Add comments
- Check notifications

```bash
npm run demo
```

## API Endpoints

### Users
- `GET /users` - List all users
- `POST /users` - Create user
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Projects
- `GET /projects` - List all projects
- `POST /projects` - Create project
- `GET /projects/:id` - Get project by ID
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `POST /projects/:id/members` - Add member
- `DELETE /projects/:id/members` - Remove member

### Tasks
- `GET /tasks` - List all tasks (optionally filter by `?projectId=X`)
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/status` - Change task status
- `PUT /tasks/:id/assign` - Assign task to user

### Comments
- `GET /comments?taskId=X` - Get comments for a task
- `POST /comments` - Create comment
- `GET /comments/:id` - Get comment by ID
- `DELETE /comments/:id` - Delete comment

### Notifications
- `GET /notifications?userId=X` - Get user notifications
- `PUT /notifications/:id/read` - Mark notification as read

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
  createdAt: number;
}
```

### Notification
```typescript
{
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: number;
}
```

## Events

### Task Service Events
- `task.assigned` - Payload: `{ taskId, taskTitle, assigneeId }`
- `task.statusChanged` - Payload: `{ taskId, taskTitle, assigneeId, oldStatus, newStatus }`

### Comment Service Events
- `comment.added` - Payload: `{ commentId, taskId, taskTitle, authorId, authorName }`

### Notification Service (Subscriber)
Subscribes to all above events and creates notifications for affected users.

## Status Transitions

Tasks follow forward-only status transitions:
```
todo → in-progress → done
```

Backward transitions are not allowed. Attempting a backward transition will raise an error.

## Build & Type Check

```bash
npm run build      # Compile TypeScript to JavaScript
npm run typecheck  # Check types without building
```

## Architecture Decisions

### Why Event Bus instead of Direct Service Calls?
- **Decoupling**: Services don't need to know about each other
- **Extensibility**: New services can subscribe to events without modifying existing code
- **Scalability**: Easy to add new event handlers in the future

### Why Service-Owned Data Stores?
- **Data Integrity**: Each service controls its own invariants
- **Isolation**: Prevents cross-service data corruption
- **Simplicity**: Clear ownership and responsibility

### Why Node.js Built-ins Only?
- **Minimal Dependencies**: No external framework overhead
- **Clear Architecture**: Patterns are visible, not hidden by framework magic
- **Educational**: Demonstrates core concepts without framework abstractions

## Example Usage

```bash
# Start server
npm run dev &

# Create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# Create a project
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project", "description": "Test project"}'

# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Do something", "description": "Task details", "projectId": "proj_1"}'

# Assign task (generates notification)
curl -X PUT http://localhost:3000/tasks/task_1/assign \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": "user_1"}'

# Check notifications
curl http://localhost:3000/notifications?userId=user_1
```

## Testing

All data is stored in-memory, so each server restart starts with a clean state. The demo script provides comprehensive testing of all features.

## License

MIT
