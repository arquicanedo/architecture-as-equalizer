# Task Management API

A multi-service task management system built with Node.js using event-driven architecture. This system demonstrates proper separation of concerns, event-based inter-service communication, and clean API design.

## Features

- **Multi-Service Architecture**: User, Project, Task, Comment, and Notification services
- **Event-Driven Communication**: Services communicate through an in-memory event bus
- **Task Status Management**: Forward-only status transitions (todo → in-progress → done)
- **Real-time Notifications**: Automatic notifications for task assignments and status changes
- **RESTful API**: Full OpenAPI 3.0 compliant endpoints
- **No External Dependencies**: Uses only Node.js built-in modules for the application

## Architecture

```
┌─────────────────┐
│   HTTP Client   │
└────────┬────────┘
         │ JSON
         ▼
┌─────────────────┐
│   API Router    │
└────────┬────────┘
         │
    ┌────┴────┬─────────┬──────────┬──────────┐
    ▼         ▼         ▼          ▼          ▼
  User    Project     Task      Comment  Notification
  Service Service   Service    Service    Service
    │       │         │          │          ▲
    └───────┴─────────┴──────────┘          │
                     │          Event       │
                     └──────────Bus◄─────────┘
```

### Key Architectural Principles

1. **No Direct Service Calls**: Services don't import or call each other. All communication goes through the Event Bus.
2. **Data Ownership**: Each service exclusively owns its data store (in-memory Maps).
3. **Single Entry Point**: The Router is the only HTTP handler; services are pure functions.
4. **Event-Driven**: Task and Comment services publish events; Notification service subscribes.

## File Structure

```
src/
├── event-bus.ts              # In-memory pub/sub for inter-service communication
├── router.ts                 # HTTP request routing and handling
├── main.ts                   # Server entry point
├── demo.ts                   # Comprehensive demo script
└── services/
    ├── user-service.ts       # User management
    ├── project-service.ts    # Project and team management
    ├── task-service.ts       # Task management with status transitions
    ├── comment-service.ts    # Comments on tasks
    └── notification-service.ts # Notifications (event subscriber)
```

## Getting Started

### Prerequisites

- Node.js 18+ with npm

### Installation

```bash
npm install
```

### Running the Server

```bash
npm start
```

The server will listen on `http://localhost:3000`

### Running the Demo

In another terminal:

```bash
npm run demo
```

This will start the server and run through all features:
- Create users
- Create project and add members
- Create tasks
- Assign tasks to users
- Change task status
- Add comments
- Check notifications
- Update resources
- Delete resources

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
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
- `POST /projects/:id/members` - Add member to project
- `DELETE /projects/:id/members` - Remove member from project

### Tasks

- `GET /tasks?projectId=:id` - List tasks in a project
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task (title, description)
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/status` - Change task status (forward-only)
- `PUT /tasks/:id/assign` - Assign task to user

### Comments

- `GET /comments?taskId=:id` - List comments on a task
- `POST /comments` - Create comment
- `GET /comments/:id` - Get comment by ID
- `DELETE /comments/:id` - Delete comment

### Notifications

- `GET /notifications?userId=:id` - List notifications for a user
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

## Event Bus

The event bus allows services to communicate without direct dependencies.

### Published Events

| Event | Published By | Payload | Subscribers |
|-------|---|---------|---|
| `task.assigned` | TaskService | `{ taskId, taskTitle, assigneeId }` | NotificationService |
| `task.statusChanged` | TaskService | `{ taskId, taskTitle, assigneeId, oldStatus, newStatus }` | NotificationService |
| `comment.added` | CommentService | `{ commentId, taskId, taskTitle, authorId, authorName }` | NotificationService |

### Event Flow

1. User assigns a task → TaskService publishes `task.assigned`
2. NotificationService receives event → Creates notification for assignee
3. User views notifications → Sees assignment notification

## Design Decisions

### ADR-001: Event Bus over Direct Calls
**Rationale**: Keeps services decoupled. Adding a new service that reacts to events requires zero changes to existing services.

### ADR-002: Service-Owned Data Stores
**Rationale**: Prevents shared-state bugs. Each service has full control over its data invariants.

### ADR-003: No External Frameworks
**Rationale**: Keeps the system self-contained with zero setup. Just Node.js built-ins.

### ADR-004: Forward-Only Task Status
**Rationale**: Prevents accidental workflow reversions. Status can only progress: todo → in-progress → done.

## Example Usage

### Create a User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com"
  }'
```

### Create a Project
```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Website Redesign",
    "description": "Complete redesign of the company website"
  }'
```

### Add Member to Project
```bash
curl -X POST http://localhost:3000/projects/{projectId}/members \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{userId}"
  }'
```

### Create a Task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design mockups",
    "description": "Create high-fidelity mockups",
    "projectId": "{projectId}"
  }'
```

### Assign Task
```bash
curl -X PUT http://localhost:3000/tasks/{taskId}/assign \
  -H "Content-Type: application/json" \
  -d '{
    "assigneeId": "{userId}"
  }'
```

### Change Task Status
```bash
curl -X PUT http://localhost:3000/tasks/{taskId}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-progress"
  }'
```

### Add Comment
```bash
curl -X POST http://localhost:3000/comments \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "{taskId}",
    "authorId": "{userId}",
    "body": "Great work!"
  }'
```

### Check Notifications
```bash
curl http://localhost:3000/notifications?userId={userId}
```

## Testing

The demo script (`npm run demo`) comprehensively tests:
- All CRUD operations for each service
- Event bus integration (notifications from task assignments and status changes)
- Forward-only task status transitions
- Member management in projects
- Comment creation and retrieval
- Error handling (404s, invalid transitions)

## Performance Considerations

- **In-Memory Storage**: All data is stored in memory (Map structures). Perfect for demos and prototypes. For production, integrate a database.
- **Event Queue**: The event bus is synchronous. For scaling, consider async event queues (Redis, RabbitMQ, Kafka).
- **Request Parsing**: Full request body is buffered in memory. Fine for typical API usage.

## Constraints Satisfied

✅ No direct service-to-service calls (Event Bus)
✅ Data ownership by services
✅ Single entry point (Router)
✅ Forward-only task status transitions
✅ No external dependencies (Node.js only)
✅ Each service in its own file
✅ TypeScript with strict mode
✅ Runnable with `npx tsx src/main.ts`
✅ Demo script exercises all features
✅ OpenAPI 3.0 compliant

## License

MIT
