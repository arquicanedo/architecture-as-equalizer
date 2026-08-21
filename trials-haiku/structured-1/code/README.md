# Task Management API

A TypeScript-based Task Management API demonstrating clean architecture patterns with an event-driven system for inter-service communication.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    HTTP Client                                │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP JSON
                         ▼
         ┌───────────────────────────────────┐
         │       API Router                   │
         │  (event-bus.ts, router.ts)        │
         └──────────┬──────────────────┬──────┘
                    │                  │
         ┌──────────┴────────┐    ┌────┴─────────────────┐
         │   User Service    │    │  Project Service     │
         │   Task Service    │    │  Comment Service     │
         │  Notification Svc │    │                      │
         └──────────────────┘    └────────────────────────┘
                    │
                    │ Publish/Subscribe
                    ▼
         ┌──────────────────────┐
         │    Event Bus         │
         │ (In-memory pub/sub)  │
         └──────────────────────┘
```

## Key Features

- **Event-Driven Architecture**: Services communicate through an in-memory event bus
- **Decoupled Services**: No direct service-to-service calls
- **Data Isolation**: Each service owns its data store
- **No External Dependencies**: Uses only Node.js built-in modules
- **Clean REST API**: Standard HTTP methods and status codes
- **Status Transitions**: Forward-only task status progression (todo → in-progress → done)

## Services

### User Service
- Create, read, update, delete users
- Data: `{ id, name, email }`

### Project Service
- Create, read, update, delete projects
- Add/remove members from projects
- Data: `{ id, name, description, memberIds[] }`

### Task Service
- Create, read, update, delete tasks
- Assign tasks to users
- Change task status (forward-only)
- Publish events: `task.assigned`, `task.statusChanged`
- Data: `{ id, title, description, status, assigneeId, projectId }`

### Comment Service
- Create, read, delete comments on tasks
- Publish events: `comment.added`
- Data: `{ id, taskId, authorId, body, createdAt }`

### Notification Service
- Get notifications for users
- Mark notifications as read
- Subscribes to: `task.assigned`, `task.statusChanged`, `comment.added`
- Data: `{ id, userId, message, read, createdAt }`

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

```bash
npm run demo
```

The demo script exercises all features:
1. Creates users
2. Creates a project
3. Adds members to the project
4. Creates tasks
5. Assigns tasks to users
6. Changes task statuses
7. Adds comments
8. Verifies notifications were created
9. Marks notifications as read

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
- `GET /tasks` - Get all tasks
- `GET /tasks?projectId=X` - Get tasks by project
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/assign` - Assign task
- `PUT /tasks/:id/status` - Change task status

### Comments
- `GET /comments?taskId=X` - Get comments by task
- `POST /comments` - Create comment
- `GET /comments/:id` - Get comment by ID
- `DELETE /comments/:id` - Delete comment

### Notifications
- `GET /notifications?userId=X` - Get notifications by user
- `PUT /notifications/:id/read` - Mark notification as read

## Example Usage

### Create a user
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

### Create a project
```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Website Redesign", "description": "Redesign company website"}'
```

### Create a task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Design mockups", "description": "Create UI mockups", "projectId": "p1"}'
```

### Assign a task
```bash
curl -X PUT http://localhost:3000/tasks/t1/assign \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": "u1"}'
```

### Change task status
```bash
curl -X PUT http://localhost:3000/tasks/t1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

## File Structure

```
src/
├── event-bus.ts              # Event Bus (pub/sub)
├── router.ts                 # API Router (HTTP handler)
├── main.ts                   # Server entry point
├── demo.ts                   # Demo script
└── services/
    ├── user-service.ts       # User management
    ├── project-service.ts    # Project management
    ├── task-service.ts       # Task management
    ├── comment-service.ts    # Comment management
    └── notification-service.ts # Notification management
```

## Key Design Decisions

1. **Event Bus for Decoupling**: Services don't import each other; they communicate through events
2. **In-Memory Storage**: All data is stored in-memory (suitable for this demo/POC)
3. **No External Frameworks**: Uses only Node.js built-in modules (http, url, etc.)
4. **Forward-Only Status**: Task status can only progress forward (todo → in-progress → done)
5. **Separation of Concerns**: Each file has a single responsibility

## Building

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

## Type Checking

```bash
npm run check
```

Runs TypeScript compiler without emitting files (useful for CI/CD).

## License

ISC
