# Task Management API

A fully functional task management API system built with TypeScript and Node.js. The system allows users to create projects, manage tasks, add comments, and receive real-time notifications.

## Features

- **User Management**: Create, read, update, and delete users
- **Project Management**: Create projects, add/remove members, manage project details
- **Task Management**: Create tasks with status tracking (todo → in-progress → done)
- **Comments**: Add comments to tasks with automatic notifications
- **Notifications**: Real-time event-driven notifications for task assignments, status changes, and comments
- **Event-Driven Architecture**: Decoupled services using in-memory event bus
- **In-Memory Storage**: All data stored in-memory (no database required)

## Architecture

The system follows a service-oriented architecture with the following components:

### Core Services

1. **User Service** (`src/user-service.ts`)
   - Manages user data (id, name, email)
   - CRUD operations on users

2. **Project Service** (`src/project-service.ts`)
   - Manages projects with metadata
   - Handles project membership

3. **Task Service** (`src/task-service.ts`)
   - Manages tasks within projects
   - Validates status transitions (todo → in-progress → done)
   - Publishes task-related events

4. **Comment Service** (`src/comment-service.ts`)
   - Manages comments on tasks
   - Publishes comment events with timestamps

5. **Notification Service** (`src/notification-service.ts`)
   - Creates notifications for users
   - Listens to events from other services
   - Tracks read/unread status

### Supporting Components

- **Event Bus** (`src/event-bus.ts`): Simple pub/sub system for inter-service communication
- **API Router** (`src/api-router.ts`): HTTP request handler and route dispatcher
- **Main** (`src/main.ts`): HTTP server setup and initialization

## API Endpoints

### Users
- `GET /users` - Get all users
- `POST /users` - Create a new user
- `GET /users/:id` - Get a specific user
- `PUT /users/:id` - Update a user
- `DELETE /users/:id` - Delete a user

### Projects
- `GET /projects` - Get all projects
- `POST /projects` - Create a new project
- `GET /projects/:id` - Get a specific project
- `PUT /projects/:id` - Update a project
- `DELETE /projects/:id` - Delete a project
- `POST /projects/:id/members` - Add a member to a project
- `DELETE /projects/:id/members/:userId` - Remove a member from a project

### Tasks
- `GET /tasks?projectId=:id` - Get tasks (optionally filtered by project)
- `POST /tasks` - Create a new task
- `GET /tasks/:id` - Get a specific task
- `PUT /tasks/:id` - Update a task
- `DELETE /tasks/:id` - Delete a task
- `PUT /tasks/:id/status` - Change task status
- `PUT /tasks/:id/assign` - Assign a task to a user

### Comments
- `GET /comments?taskId=:id` - Get comments (optionally filtered by task)
- `POST /comments` - Create a new comment
- `GET /comments/:id` - Get a specific comment
- `DELETE /comments/:id` - Delete a comment

### Notifications
- `GET /notifications?userId=:id` - Get notifications (optionally filtered by user)
- `PUT /notifications/:id/read` - Mark a notification as read

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

The demo script demonstrates all features of the system:
- Creating users
- Creating a project and adding members
- Creating tasks and assigning them
- Adding comments
- Checking notifications
- Performing CRUD operations

## Building

```bash
npm run build
```

## Checking TypeScript

```bash
npm run check
```

## Event Flow Example

1. **Task Assignment**:
   ```
   Task Service (assignTask) 
   → Publishes "task.assigned" event
   → Notification Service receives event
   → Creates notification for the assigned user
   ```

2. **Comment Added**:
   ```
   Comment Service (createComment)
   → Publishes "comment.added" event
   → Notification Service receives event
   → Creates notification for task assignee
   ```

3. **Task Status Change**:
   ```
   Task Service (changeStatus)
   → Publishes "task.statusChanged" event
   → Notification Service receives event
   → Creates notification for task assignee
   ```

## Data Structures

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
  members: string[]; // user IDs
}
```

### Task
```typescript
{
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  assigneeId?: string;
}
```

### Comment
```typescript
{
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  timestamp: number;
}
```

### Notification
```typescript
{
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: number;
}
```

## Design Principles

1. **Separation of Concerns**: Each service owns its data and business logic
2. **Event-Driven**: Services communicate through events, not direct calls
3. **In-Memory Storage**: No external dependencies or setup required
4. **Strict TypeScript**: Full type safety with strict compiler settings
5. **No External Frameworks**: Uses only Node.js built-in modules for HTTP

## Error Handling

- Invalid requests return 400 Bad Request
- Missing resources return 404 Not Found
- Server errors return 500 Internal Server Error
- All responses are JSON formatted

## Future Enhancements

- Add database persistence (MongoDB, PostgreSQL, etc.)
- Implement user authentication
- Add rate limiting and request validation
- Implement task filtering and sorting
- Add task priorities and due dates
- Implement team collaboration features
- Add activity logging
