# Task Management API

A multi-service task management system with event-driven architecture, built with Node.js and TypeScript.

## Features

- ✅ **Event-Driven Architecture**: Services communicate through a pub/sub event bus
- ✅ **Service Isolation**: Each service owns its data store
- ✅ **No External Dependencies**: Uses only Node.js built-in modules for application code
- ✅ **Forward-Only Task Transitions**: Tasks follow `todo → in-progress → done` workflow
- ✅ **Real-time Notifications**: Event-driven notifications for task assignments and updates
- ✅ **Full REST API**: OpenAPI 3.0 compliant

## Architecture

```
┌─────────────┐
│ HTTP Client │
└──────┬──────┘
       │
    ┌──┴──────────────────────┐
    │    API Router (HTTP)     │
    └──┬───────────────────────┘
       │
    ┌──┴─────────────────────────────────────────────────┐
    │                                                       │
    ▼              ▼                 ▼               ▼      ▼
┌────────┐  ┌───────────┐    ┌──────────┐    ┌─────────┐ ┌────────────┐
│ User   │  │ Project   │    │ Task     │    │Comment  │ │Notification│
│Service │  │ Service   │    │ Service  │    │Service  │ │Service     │
└────────┘  └───────────┘    └──────────┘    └─────────┘ └────────────┘
     │            │                │              │
     └────────────┴────────────────┴──────────────┘
                  ▼
             Event Bus
             (pub/sub)
```

## Architecture Constraints

1. **No direct service-to-service calls** - All inter-service communication goes through the Event Bus
2. **Data ownership** - Each service exclusively owns its data store
3. **Single entry point** - All HTTP handling is in the API Router
4. **Forward-only status transitions** - Task status: `todo → in-progress → done`
5. **No external dependencies** - Only Node.js built-in modules for application code

## Project Structure

```
src/
├── event-bus.ts              # In-memory pub/sub event bus
├── services/
│   ├── user-service.ts       # User management
│   ├── project-service.ts    # Project management
│   ├── task-service.ts       # Task management (publishes events)
│   ├── comment-service.ts    # Comment management (publishes events)
│   └── notification-service.ts # Notifications (subscribes to events)
├── router.ts                 # API HTTP router
├── main.ts                   # Server entry point
└── demo.ts                   # Demo script
```

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## Running the Demo

The demo script showcases all features:

```bash
npm run demo
```

The demo will:
1. Create users
2. Create a project and add members
3. Create tasks
4. Assign tasks to users (triggers notifications)
5. Change task status (triggers notifications)
6. Add comments to tasks (triggers notifications)
7. List notifications for users
8. Mark notifications as read
9. Update various resources
10. Retrieve and verify data

## API Endpoints

### Users
- `GET /users` - List all users
- `POST /users` - Create a user
- `GET /users/{id}` - Get user by ID
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user

### Projects
- `GET /projects` - List all projects
- `POST /projects` - Create a project
- `GET /projects/{id}` - Get project by ID
- `PUT /projects/{id}` - Update project
- `DELETE /projects/{id}` - Delete project
- `POST /projects/{id}/members` - Add member to project
- `DELETE /projects/{id}/members` - Remove member from project

### Tasks
- `GET /tasks?projectId={projectId}` - List tasks by project
- `POST /tasks` - Create a task
- `GET /tasks/{id}` - Get task by ID
- `PUT /tasks/{id}` - Update task (title/description)
- `DELETE /tasks/{id}` - Delete task
- `PUT /tasks/{id}/status` - Change task status (forward-only)
- `PUT /tasks/{id}/assign` - Assign task to user

### Comments
- `GET /comments?taskId={taskId}` - List comments by task
- `POST /comments` - Create a comment
- `GET /comments/{id}` - Get comment by ID
- `DELETE /comments/{id}` - Delete comment

### Notifications
- `GET /notifications?userId={userId}` - List user's notifications
- `PUT /notifications/{id}/read` - Mark notification as read

## Event Flow

### Task Assignment Event
When a task is assigned:
```
TaskService.assignTask()
  ↓
eventBus.publish('task.assigned', {...})
  ↓
NotificationService (subscriber)
  ↓
Creates notification for assignee
```

### Task Status Change Event
When task status changes:
```
TaskService.changeStatus()
  ↓
eventBus.publish('task.statusChanged', {...})
  ↓
NotificationService (subscriber)
  ↓
Creates notification for assignee
```

### Comment Added Event
When a comment is added:
```
CommentService.createComment()
  ↓
eventBus.publish('comment.added', {...})
  ↓
NotificationService (subscriber)
  ↓
Creates notification for author
```

## Example API Usage

### Create a User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

### Create a Project
```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Website Redesign", "description": "Redesign company website"}'
```

### Create a Task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Design mockups", "description": "Create UI mockups", "projectId": "project_1"}'
```

### Assign a Task
```bash
curl -X PUT http://localhost:3000/tasks/task_1/assign \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": "user_1"}'
```

### Change Task Status
```bash
curl -X PUT http://localhost:3000/tasks/task_1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

## Type Safety

The system is fully typed with TypeScript. Run type checking:

```bash
npm run check
```

Build the project:

```bash
npm run build
```

## In-Memory Storage

All data is stored in-memory using TypeScript Maps. Data is lost when the server stops. This is suitable for:
- Development and testing
- Demonstrations
- Prototyping

For production, replace the in-memory stores with a database backend.

## Design Patterns

### Event Bus Pattern
Services communicate asynchronously through events, keeping them loosely coupled.

### Service Isolation
Each service has its own data store and API, with no cross-service dependencies.

### Repository Pattern
Services manage their own in-memory repositories (Map-based stores).

## Architectural Decisions

### ADR-001: Event Bus over Direct Calls
- **Decision**: Use in-memory pub/sub for inter-service communication
- **Rationale**: Keeps services decoupled. Adding a new service that reacts to events requires zero changes to existing services.
- **Tradeoff**: Slightly harder to trace execution flow; no compile-time guarantee that event subscribers exist.

### ADR-002: Service-Owned Data Stores
- **Decision**: Each service maintains its own in-memory Map
- **Rationale**: Prevents shared-state bugs. Each service has full control over its data invariants.
- **Tradeoff**: Cross-service queries require coordination through the router, not a single data lookup.

### ADR-003: No External Frameworks
- **Decision**: Use Node.js built-in `http` module only
- **Rationale**: Keeps the system self-contained with zero setup.
- **Tradeoff**: More boilerplate for request parsing and routing.

## Testing

The demo script provides comprehensive end-to-end testing:

```bash
npm run demo
```

It validates:
- User creation and retrieval
- Project creation and member management
- Task creation and assignment
- Task status transitions
- Comment creation
- Event-driven notification generation
- Notification reading

## License

MIT
