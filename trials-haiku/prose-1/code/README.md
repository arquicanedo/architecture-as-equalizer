# Task Management API

A fully in-memory task management API built with TypeScript and Node.js, using a clean, event-driven architecture with no external database dependencies.

## Architecture

The system consists of several services that communicate through an in-memory Event Bus:

### Services

- **User Service**: Manages user creation, retrieval, update, and deletion
- **Project Service**: Manages projects and their members
- **Task Service**: Manages tasks with validated status transitions (todo → in-progress → done)
- **Comment Service**: Manages comments on tasks
- **Notification Service**: Generates notifications based on events from other services

### Event Bus

A simple publish/subscribe system that allows services to communicate without direct dependencies:
- Services publish events when important things happen
- Other services subscribe to events they care about
- This creates a loosely coupled, extensible architecture

### API Router

An HTTP request router that:
- Parses incoming requests
- Routes them to appropriate service methods
- Serializes responses as JSON
- Handles all error cases gracefully

## Features

### User Management
- Create, read, update, delete users
- Users have id, name, and email

### Project Management
- Create, read, update, delete projects
- Add and remove project members
- Projects have id, name, description, and member list

### Task Management
- Create, read, update, delete tasks
- Assign tasks to users
- Update task status with validation (todo → in-progress → done)
- Tasks belong to projects and have status, assignee, title, and description

### Comments
- Add comments to tasks
- Comments include author, text, and timestamp
- Automatically notifies task assignee when someone comments

### Notifications
- Receive notifications for task assignments
- Receive notifications for status changes
- Receive notifications when someone comments on your task
- Mark notifications as read

## API Endpoints

### Users
- `GET /users` - List all users
- `POST /users` - Create a user
- `GET /users/:id` - Get a user
- `PUT /users/:id` - Update a user
- `DELETE /users/:id` - Delete a user

### Projects
- `GET /projects` - List all projects
- `POST /projects` - Create a project
- `GET /projects/:id` - Get a project
- `PUT /projects/:id` - Update a project
- `DELETE /projects/:id` - Delete a project
- `POST /projects/:id/members` - Add a member
- `DELETE /projects/:id/members` - Remove a member

### Tasks
- `GET /tasks` - List all tasks (supports ?projectId filter)
- `POST /tasks` - Create a task
- `GET /tasks/:id` - Get a task
- `PUT /tasks/:id` - Update a task
- `DELETE /tasks/:id` - Delete a task
- `PUT /tasks/:id/status` - Update task status
- `PUT /tasks/:id/assign` - Assign task to a user

### Comments
- `GET /comments` - List all comments (supports ?taskId filter)
- `POST /comments` - Add a comment
- `DELETE /comments/:id` - Delete a comment

### Notifications
- `GET /notifications` - List all notifications (supports ?userId filter)
- `PUT /notifications/:id/read` - Mark notification as read

## Running the System

### Start the Server
```bash
npm start
# Server listens on http://localhost:3000
```

### Run the Demo
The demo script exercises all system features:
```bash
npm run demo
```

The demo will:
1. Create 3 users (Alice, Bob, Charlie)
2. Create a project and add all users as members
3. Create 3 tasks
4. Assign tasks to users (which generates notifications)
5. Add comments (which generates notifications)
6. Update task statuses (which generates notifications)
7. Mark notifications as read
8. Display the final system state

### Type Checking
```bash
npm run type-check
```

## Implementation Details

### Event Types

- **task.created**: Published when a task is created
- **task.assigned**: Published when a task is assigned to a user
- **task.status-changed**: Published when a task's status changes
- **comment.added**: Published when a comment is added to a task

### Status Transitions

Tasks follow a strict status progression:
- Start: `todo`
- Can transition to: `in-progress`
- Can transition to: `done`
- Cannot go backwards in the progression

### Data Storage

All data is stored in-memory using TypeScript Maps:
- Each service owns and maintains its own data
- No shared data stores between services
- No external database

## Project Structure

```
src/
├── event-bus.ts          # Event bus for inter-service communication
├── user-service.ts       # User management
├── project-service.ts    # Project management
├── task-service.ts       # Task management
├── comment-service.ts    # Comment management
├── notification-service.ts # Notification management
├── api-router.ts         # HTTP request routing
├── main.ts              # Server entry point
└── demo.ts              # Demo script
```

## Technologies

- **TypeScript**: For type safety and better development experience
- **Node.js**: Runtime environment
- **Built-in modules only**: Uses http, url, and crypto from Node.js standard library
- **In-memory storage**: No external dependencies or databases

## Design Principles

1. **Loose Coupling**: Services communicate through events, not direct calls
2. **Single Responsibility**: Each service manages its own domain
3. **Data Ownership**: Each service owns its data exclusively
4. **Immutability Where Possible**: Data updates create new references
5. **Error Handling**: Graceful error handling at all layers
6. **Type Safety**: Full TypeScript strict mode
