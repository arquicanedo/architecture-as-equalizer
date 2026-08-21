# Task Management API

A fully functional Task Management system built with TypeScript and Node.js following the C4 Model architecture specification. The system demonstrates clean architecture principles with decoupled services communicating through an in-memory event bus.

## Architecture Overview

### System Architecture (C4 Level 1)
The system consists of a single HTTP-based software system with a clear separation of concerns:

- **API Router**: Single entry point for all HTTP requests
- **Event Bus**: In-memory pub/sub for inter-service communication
- **Services**: User, Project, Task, Comment, and Notification services
- **Data Stores**: Each service owns an in-memory Map for its data

### Key Architectural Principles

1. **No Direct Service-to-Service Calls**: All inter-service communication occurs through the Event Bus
2. **Service-Owned Data**: Each service exclusively owns and controls its data store
3. **Single Entry Point**: All HTTP handling is centralized in the API Router
4. **Forward-Only Status Transitions**: Task status follows: `todo → in-progress → done`
5. **No External Dependencies**: Uses only Node.js built-in modules (http, crypto, url)

## File Structure

```
src/
├── event-bus.ts              # In-memory pub/sub event broker
├── services/
│   ├── user-service.ts       # User management
│   ├── project-service.ts    # Project & membership management
│   ├── task-service.ts       # Task lifecycle management
│   ├── comment-service.ts    # Comment management
│   └── notification-service.ts # Notification creation & querying
├── router.ts                 # HTTP request routing & handling
├── main.ts                   # Application entry point
└── demo.ts                   # End-to-end demonstration script
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
- `GET /tasks?projectId=X` - Get tasks for a project
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task by ID
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/assign` - Assign task to user
- `PUT /tasks/:id/status` - Change task status

### Comments
- `GET /comments?taskId=X` - Get comments for a task
- `POST /comments` - Create comment
- `GET /comments/:id` - Get comment by ID
- `DELETE /comments/:id` - Delete comment

### Notifications
- `GET /notifications?userId=X` - Get notifications for a user
- `PUT /notifications/:id/read` - Mark notification as read

## Event Flow

### Task Assignment
```
User Service → Task Service.assign()
           ↓
        Event Bus.publish("task.assigned", {...})
           ↓
    Notification Service subscribes
           ↓
     Creates notification for assignee
```

### Comment Addition
```
Comment Service.create()
        ↓
 Event Bus.publish("comment.added", {...})
        ↓
 Router notifies Notification Service
        ↓
 Creates notification for task assignee
```

### Status Changes
```
Task Service.changeStatus()
        ↓
Event Bus.publish("task.statusChanged", {...})
        ↓
Notification Service subscribes
        ↓
Creates notification for assignee
```

## Data Models

### User
```typescript
{
  id: string;           // UUID
  name: string;
  email: string;
}
```

### Project
```typescript
{
  id: string;           // UUID
  name: string;
  description: string;
  memberIds: string[];  // User IDs
}
```

### Task
```typescript
{
  id: string;           // UUID
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
  id: string;           // UUID
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;    // ISO 8601
}
```

### Notification
```typescript
{
  id: string;           // UUID
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;    // ISO 8601
}
```

## Getting Started

### Installation
```bash
npm install
```

### Run the Server
```bash
npm start
```

The server will start on `http://localhost:3000`

### Run the Demo
```bash
npm run demo
```

The demo script will:
1. Create 3 users
2. Create 1 project
3. Add users to the project
4. Create 3 tasks
5. Assign tasks to users (triggers notifications)
6. Change task status (triggers notifications)
7. Add comments (triggers notifications)
8. Display notifications
9. Mark notifications as read

### Type Check
```bash
npm run type-check
```

### Build
```bash
npm run build
```

## Design Patterns

### Event-Driven Architecture
Services publish domain events through the Event Bus. Other services subscribe to relevant events without direct dependencies.

### Repository Pattern
Each service maintains an in-memory repository (Map) of its entities with a consistent interface.

### Dependency Injection
Services are instantiated and exported as singletons, making them available to the router.

## Constraints & Trade-offs

### Advantages
- ✅ Complete decoupling of services
- ✅ Easy to add new services (e.g., email notifications)
- ✅ No external framework dependencies
- ✅ Type-safe with TypeScript
- ✅ In-memory data (no database setup required)

### Trade-offs
- ❌ Event subscribers not guaranteed at compile time
- ❌ Harder to trace execution flow in debugging
- ❌ No persistence across server restarts
- ❌ More boilerplate for HTTP handling (no framework)

## Example Usage

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
  -d '{"name": "Q1 Redesign", "description": "Website redesign project"}'
```

### Assign a Task
```bash
curl -X PUT http://localhost:3000/tasks/:taskId/assign \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": "user-uuid"}'
```

### Add a Comment
```bash
curl -X POST http://localhost:3000/comments \
  -H "Content-Type: application/json" \
  -d '{"taskId": "task-uuid", "authorId": "user-uuid", "body": "Great progress!"}'
```

## Implementation Notes

- All IDs are generated using Node.js `crypto.randomUUID()`
- Timestamps are ISO 8601 format
- Task status transitions enforce: `todo → in-progress → done` (no backward transitions)
- Services validate references (e.g., comment requires valid task and author)
- Events are published asynchronously and errors in subscribers don't affect the publisher
