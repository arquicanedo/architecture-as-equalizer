# Task Management API

A TypeScript-based task management system using an event-driven architecture. The system runs entirely in-memory with no external dependencies beyond Node.js built-in modules.

## Features

- **User Management**: Create, read, update, and delete users
- **Project Management**: Create projects and manage project members
- **Task Management**: Create tasks, assign them to users, and track status with validated state transitions
- **Comments**: Add comments to tasks with automatic notifications
- **Notifications**: Receive notifications for task assignments, status changes, and comments
- **Event-Driven Architecture**: Services communicate via a publish/subscribe event bus
- **In-Memory Storage**: All data stored in memory (no database required)

## Architecture

### Components

1. **Event Bus** (`src/event-bus.ts`)
   - Simple pub/sub system for inter-service communication
   - Services publish events when notable changes occur
   - Other services subscribe to relevant events

2. **User Service** (`src/services/user-service.ts`)
   - Manages user creation, retrieval, updates, and deletion
   - Each user has: id, name, email

3. **Project Service** (`src/services/project-service.ts`)
   - Manages project creation and membership
   - Each project has: id, name, description, members list

4. **Task Service** (`src/services/task-service.ts`)
   - Manages tasks with status validation
   - Status transitions: `todo` → `in-progress` → `done`
   - Each task has: id, projectId, title, description, status, assignee, createdAt
   - Publishes events when tasks are assigned or status changes

5. **Comment Service** (`src/services/comment-service.ts`)
   - Manages comments on tasks
   - Each comment has: id, taskId, authorId, text, createdAt
   - Publishes events when comments are added

6. **Notification Service** (`src/services/notification-service.ts`)
   - Creates notifications for users based on events
   - Subscribes to: task assignments, status changes, comments
   - Each notification has: id, userId, message, read flag, timestamp

7. **API Router** (`src/api-router.ts`)
   - Handles HTTP requests and routes to appropriate service methods
   - Parses JSON request bodies
   - Returns JSON responses

8. **Main Entry Point** (`src/main.ts`)
   - Sets up HTTP server on port 3000
   - Initializes all services
   - Wires up event subscriptions

## API Routes

### Users
- `GET /users` - Get all users
- `POST /users` - Create user (body: `{name, email}`)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user (body: partial user object)
- `DELETE /users/:id` - Delete user

### Projects
- `GET /projects` - Get all projects
- `POST /projects` - Create project (body: `{name, description}`)
- `GET /projects/:id` - Get project by ID
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `POST /projects/:id/members` - Add member (body: `{userId}`)
- `DELETE /projects/:id/members` - Remove member (body: `{userId}`)

### Tasks
- `GET /tasks?projectId=:id` - Get tasks (optionally filtered by project)
- `POST /tasks` - Create task (body: `{projectId, title, description}`)
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/status` - Update status (body: `{status}` where status is 'todo', 'in-progress', or 'done')
- `PUT /tasks/:id/assign` - Assign task to user (body: `{userId}`)

### Comments
- `GET /comments?taskId=:id` - Get comments (optionally filtered by task)
- `POST /comments` - Create comment (body: `{taskId, authorId, text}`)
- `GET /comments/:id` - Get comment by ID
- `DELETE /comments/:id` - Delete comment

### Notifications
- `GET /notifications?userId=:id` - Get notifications (optionally filtered by user)
- `PUT /notifications/:id/read` - Mark notification as read

## Getting Started

### Installation

```bash
npm install
```

### Running the Server

```bash
npm start
```

The server will start on port 3000 (configurable via `PORT` environment variable).

### Running the Demo

```bash
npm run demo
```

The demo script exercises all features:
1. Creates 3 users
2. Creates a project and adds all users as members
3. Creates 3 tasks
4. Assigns tasks to different users
5. Updates task statuses
6. Adds comments to tasks
7. Displays notifications for each user

## Design Rationale

### Event-Driven Architecture
Services communicate through events rather than direct method calls. This keeps services loosely coupled:
- Services don't need to know about other services' internals
- New services can easily subscribe to existing events
- Changes to one service don't affect others

### Data Ownership
Each service owns its data exclusively:
- User Service owns all user data
- Project Service owns all project data
- Task Service owns all task data
- Comment Service owns all comment data
- Notification Service owns all notification data

This prevents bugs from shared state and makes the system easier to understand and modify.

### Status Validation
The Task Service validates that status transitions follow the allowed sequence:
- Can only move from `todo` to `in-progress`
- Can only move from `in-progress` to `done`
- Cannot move backwards in status
- Attempting invalid transitions throws an error

### In-Memory Storage
All data is stored in JavaScript Maps, making the system:
- Simple to run without external dependencies
- Fast (no database latency)
- Easy to understand and test
- Data is lost when the server stops (suitable for demo/testing)

## TypeScript Configuration

The project uses TypeScript with strict mode enabled:
- Full type safety
- No `any` types without explicit cast
- Compilation verified with `npx tsc --noEmit`

## File Structure

```
.
├── src/
│   ├── event-bus.ts              # Event pub/sub system
│   ├── main.ts                   # Server entry point
│   ├── api-router.ts             # HTTP request routing
│   ├── demo.ts                   # Demo script
│   └── services/
│       ├── user-service.ts       # User management
│       ├── project-service.ts    # Project management
│       ├── task-service.ts       # Task management
│       ├── comment-service.ts    # Comment management
│       └── notification-service.ts # Notification management
├── package.json
├── tsconfig.json
└── README.md
```

## Examples

### Creating a User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson", "email": "alice@example.com"}'
```

### Creating a Project
```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Website Redesign", "description": "Redesign the company website"}'
```

### Creating a Task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"projectId": "project-uuid", "title": "Design mockups", "description": "Create high-fidelity mockups"}'
```

### Assigning a Task
```bash
curl -X PUT http://localhost:3000/tasks/task-uuid/assign \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid"}'
```

### Updating Task Status
```bash
curl -X PUT http://localhost:3000/tasks/task-uuid/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

### Getting Notifications
```bash
curl http://localhost:3000/notifications?userId=user-uuid
```

## License

MIT
