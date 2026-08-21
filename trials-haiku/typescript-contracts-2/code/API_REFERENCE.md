# Task Management API — Quick Reference

## Base URL
```
http://localhost:3000
```

## Request/Response Format
All requests and responses use JSON format.

---

## Users Endpoints

### List all users
```
GET /users
```
**Response**: Array of User objects

### Create a user
```
POST /users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```
**Response**: User object (with generated id)

### Get user by ID
```
GET /users/{userId}
```
**Response**: User object

### Update user
```
PUT /users/{userId}
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```
**Response**: Updated User object

### Delete user
```
DELETE /users/{userId}
```
**Response**: 204 No Content

---

## Projects Endpoints

### List all projects
```
GET /projects
```
**Response**: Array of Project objects

### Create a project
```
POST /projects
Content-Type: application/json

{
  "name": "Website Redesign",
  "description": "Complete redesign of company website"
}
```
**Response**: Project object

### Get project by ID
```
GET /projects/{projectId}
```
**Response**: Project object

### Update project
```
PUT /projects/{projectId}
Content-Type: application/json

{
  "name": "Updated name",
  "description": "Updated description"
}
```
**Response**: Updated Project object

### Delete project
```
DELETE /projects/{projectId}
```
**Response**: 204 No Content

### Add member to project
```
POST /projects/{projectId}/members
Content-Type: application/json

{
  "userId": "{userId}"
}
```
**Response**: Updated Project object (with new memberIds)

### Remove member from project
```
DELETE /projects/{projectId}/members
Content-Type: application/json

{
  "userId": "{userId}"
}
```
**Response**: Updated Project object

---

## Tasks Endpoints

### Get tasks by project
```
GET /tasks?projectId={projectId}
```
**Response**: Array of Task objects for the project

### Create a task
```
POST /tasks
Content-Type: application/json

{
  "title": "Design mockups",
  "description": "Create initial design mockups",
  "projectId": "{projectId}"
}
```
**Response**: Task object (status: "todo", assigneeId: null)

### Get task by ID
```
GET /tasks/{taskId}
```
**Response**: Task object

### Update task
```
PUT /tasks/{taskId}
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description"
}
```
**Response**: Updated Task object

### Delete task
```
DELETE /tasks/{taskId}
```
**Response**: 204 No Content

### Assign task to user
```
PUT /tasks/{taskId}/assign
Content-Type: application/json

{
  "assigneeId": "{userId}"
}
```
**Response**: Updated Task object
**Side Effect**: Publishes "task.assigned" event → creates notification for assignee

### Change task status
```
PUT /tasks/{taskId}/status
Content-Type: application/json

{
  "status": "in-progress"
}
```
**Valid transitions**:
- `todo` → `in-progress`
- `in-progress` → `done`

**Invalid transitions** (will return 500 error):
- `todo` → `done` (skip transition)
- `in-progress` → `todo` (backward)
- `done` → `in-progress` (backward)
- `done` → `todo` (backward)

**Response**: Updated Task object
**Side Effect**: Publishes "task.statusChanged" event → creates notification for assignee

---

## Comments Endpoints

### Get comments for a task
```
GET /comments?taskId={taskId}
```
**Response**: Array of Comment objects for the task

### Create a comment
```
POST /comments
Content-Type: application/json

{
  "taskId": "{taskId}",
  "authorId": "{userId}",
  "body": "This is a comment"
}
```
**Response**: Comment object (with generated id and createdAt timestamp)
**Side Effect**: Publishes "comment.added" event → creates notification for task assignee

### Get comment by ID
```
GET /comments/{commentId}
```
**Response**: Comment object

### Delete comment
```
DELETE /comments/{commentId}
```
**Response**: 204 No Content

---

## Notifications Endpoints

### Get notifications for a user
```
GET /notifications?userId={userId}
```
**Response**: Array of Notification objects for the user

### Mark notification as read
```
PUT /notifications/{notificationId}/read
```
**Response**: Updated Notification object (read: true)

---

## Data Models

### User
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string"
}
```

### Project
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "memberIds": ["uuid", ...]
}
```

### Task
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in-progress | done",
  "assigneeId": "uuid | null",
  "projectId": "uuid"
}
```

### Comment
```json
{
  "id": "uuid",
  "taskId": "uuid",
  "authorId": "uuid",
  "body": "string",
  "createdAt": "ISO 8601 timestamp"
}
```

### Notification
```json
{
  "id": "uuid",
  "userId": "uuid",
  "message": "string",
  "read": "boolean",
  "createdAt": "ISO 8601 timestamp"
}
```

---

## Error Handling

All errors return a JSON response with status code and error message:

```json
{
  "error": "Error message"
}
```

### Common Error Codes
- `400` - Bad Request (missing required query parameter)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (invalid status transition, etc.)

---

## Example Workflow

```bash
# 1. Create two users
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob", "email": "bob@example.com"}'

# 2. Create a project
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Website", "description": "Redesign"}'

# 3. Add Alice as project member
curl -X POST http://localhost:3000/projects/{projectId}/members \
  -H "Content-Type: application/json" \
  -d '{"userId": "{aliceId}"}'

# 4. Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Design", "description": "Create mockups", "projectId": "{projectId}"}'

# 5. Assign task to Alice
curl -X PUT http://localhost:3000/tasks/{taskId}/assign \
  -H "Content-Type: application/json" \
  -d '{"assigneeId": "{aliceId}"}'

# 6. Check Alice's notifications
curl http://localhost:3000/notifications?userId={aliceId}

# 7. Change status to in-progress
curl -X PUT http://localhost:3000/tasks/{taskId}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'

# 8. Add a comment
curl -X POST http://localhost:3000/comments \
  -H "Content-Type: application/json" \
  -d '{"taskId": "{taskId}", "authorId": "{bobId}", "body": "Looks good!"}'

# 9. Check Bob's notifications (if he's the assignee)
curl http://localhost:3000/notifications?userId={bobId}

# 10. Change status to done
curl -X PUT http://localhost:3000/tasks/{taskId}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```
