# Task Management API

A multi-service task management system with event-driven architecture built with TypeScript and Node.js built-in modules.

## Architecture

This system demonstrates a clean service-oriented architecture with the following principles:

- **Event-Driven Communication**: Services communicate through an in-memory event bus, not direct calls
- **Service-Owned Data**: Each service exclusively owns its data store
- **Single Entry Point**: All HTTP handling goes through a central API router
- **No External Dependencies**: Only Node.js built-in modules used for the application code

## System Components

### Services

1. **User Service** (`src/services/user-service.ts`)
   - Manages user data (create, read, update, delete)

2. **Project Service** (`src/services/project-service.ts`)
   - Manages projects and project memberships
   - Add/remove members from projects

3. **Task Service** (`src/services/task-service.ts`)
   - Manages tasks with forward-only status transitions: `todo` → `in-progress` → `done`
   - Publishes events for assignments and status changes

4. **Comment Service** (`src/services/comment-service.ts`)
   - Manages task comments
   - Publishes events when comments are added

5. **Notification Service** (`src/services/notification-service.ts`)
   - Manages user notifications
   - Subscribes to events from Task and Comment services

### Infrastructure

- **Event Bus** (`src/event-bus.ts`): In-memory pub/sub for inter-service communication
- **Router** (`src/router.ts`): HTTP request routing and JSON request/response handling
- **Main** (`src/main.ts`): Server startup and configuration

## Events

The following events are published and subscribed to via the event bus:

| Event | Publisher | Payload | Subscriber |
|-------|----------|---------|------------|
| `task.assigned` | TaskService | `{ taskId, taskTitle, assigneeId }` | NotificationService |
| `task.statusChanged` | TaskService | `{ taskId, taskTitle, assigneeId, oldStatus, newStatus }` | NotificationService |
| `comment.added` | CommentService | `{ commentId, taskId, taskTitle, authorId, authorName }` | NotificationService |

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
- `GET /tasks?projectId=:projectId` - List tasks by project
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/status` - Change task status (with validation)
- `PUT /tasks/:id/assign` - Assign task to user

### Comments
- `GET /comments?taskId=:taskId` - List comments by task
- `POST /comments` - Create comment
- `GET /comments/:id` - Get comment by ID
- `DELETE /comments/:id` - Delete comment

### Notifications
- `GET /notifications?userId=:userId` - List user notifications
- `PUT /notifications/:id/read` - Mark notification as read

## Running the Application

### Start the Server
```bash
npm start
```
The server will start on `http://localhost:3000`

### Run the Demo
```bash
npm run demo
```
This executes a comprehensive end-to-end test that:
1. Creates users
2. Creates a project
3. Adds members to the project
4. Creates tasks
5. Assigns tasks to users
6. Transitions task statuses
7. Adds comments
8. Verifies notifications are created
9. Marks notifications as read

### Type Check
```bash
npm run type-check
```

### Build
```bash
npm run build
```

## Key Design Decisions

### 1. Event Bus over Direct Calls
Services do not import or call each other directly. All inter-service communication happens through the event bus. This ensures:
- Services are completely decoupled
- Adding new event subscribers requires no changes to existing services
- Clean separation of concerns

### 2. Service-Owned Data Stores
Each service has its own in-memory Map for data storage:
- User Service: `userStore`
- Project Service: `projectStore`
- Task Service: `taskStore`
- Comment Service: `commentStore`
- Notification Service: `notificationStore`

No service may read or write another service's store.

### 3. Single Router Entry Point
All HTTP requests go through the central router:
- Routing logic in one place
- Consistent request/response handling
- Services expose methods, not HTTP endpoints

### 4. Forward-Only Task Status Transitions
Task status follows: `todo` → `in-progress` → `done`
- Backward transitions are not allowed
- Validates transitions before applying state changes

### 5. No External Dependencies
Application code uses only Node.js built-in modules:
- `http` - HTTP server
- `crypto` - (available for future use)
- `url` - URL parsing
- Development dependencies (TypeScript, tsx) allowed

## Data Structures

### User
```json
{
  "id": "user-1",
  "name": "Alice",
  "email": "alice@example.com"
}
```

### Project
```json
{
  "id": "project-1",
  "name": "Website Redesign",
  "description": "Complete redesign of the company website",
  "memberIds": ["user-1", "user-2"]
}
```

### Task
```json
{
  "id": "task-1",
  "title": "Design homepage",
  "description": "Create mockups for the new homepage",
  "status": "in-progress",
  "assigneeId": "user-1",
  "projectId": "project-1"
}
```

### Comment
```json
{
  "id": "comment-1",
  "taskId": "task-1",
  "authorId": "user-1",
  "body": "Looking good so far!",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### Notification
```json
{
  "id": "notification-1",
  "userId": "user-1",
  "message": "You have been assigned to task: Design homepage",
  "read": false,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

## File Structure

```
src/
├── event-bus.ts                    # Event bus implementation
├── main.ts                         # Server startup
├── router.ts                       # HTTP routing and request handling
├── demo.ts                         # End-to-end demo script
└── services/
    ├── user-service.ts            # User service
    ├── project-service.ts         # Project service
    ├── task-service.ts            # Task service (publishes events)
    ├── comment-service.ts         # Comment service (publishes events)
    └── notification-service.ts    # Notification service (subscribes to events)
```

## Implementation Notes

- All data is stored in-memory using JavaScript Maps
- No database is required
- Timestamps are ISO 8601 format
- IDs are generated with incremental counters and service prefixes (e.g., `user-1`, `task-1`)
- Invalid state transitions return `undefined` or error responses
- Error handling includes proper HTTP status codes (400, 404, 500)
