# Task Management API — Requirements

## Overview

Build a task management API in TypeScript using Node.js. The system allows users to create projects, manage tasks within those projects, add comments to tasks, and receive notifications about relevant changes.

All data storage is in-memory (no database). Use only Node.js built-in modules (http, crypto, etc.) — no npm packages like Express.

All request and response bodies use JSON.

## Features

### Users
- Create, retrieve, update, and delete users
- Each user has an id, name, and email
- API routes: GET/POST /users, GET/PUT/DELETE /users/:id

### Projects
- Create, retrieve, update, and delete projects
- Each project has an id, name, description, and a list of member user IDs
- Add and remove members from projects
- API routes: GET/POST /projects, GET/PUT/DELETE /projects/:id, POST/DELETE /projects/:id/members

### Tasks
- Create, retrieve, update, and delete tasks
- Each task belongs to a project and has an id, title, description, status, assignee (user ID), and project ID
- Tasks have status transitions: "todo" → "in-progress" → "done" (enforce valid transitions only)
- Tasks can be assigned to users
- Tasks can be filtered by project
- API routes: GET/POST /tasks, GET/PUT/DELETE /tasks/:id, PUT /tasks/:id/status, PUT /tasks/:id/assign

### Comments
- Create, retrieve, and delete comments on tasks
- Each comment has an id, task ID, author user ID, text body, and creation timestamp
- Comments can be filtered by task
- API routes: GET/POST /comments, GET/DELETE /comments/:id

### Notifications
- Users receive notifications when relevant events occur (task assigned, comment added, status changed)
- Each notification has an id, target user ID, message, read/unread flag, and timestamp
- Notifications can be marked as read
- Notifications can be filtered by user
- API routes: GET /notifications, PUT /notifications/:id/read

## Demo Script

Include a demo script that starts the server and exercises all features: creates users, creates a project, adds members, creates tasks, assigns tasks, adds comments, checks notifications, and marks notifications as read. This should demonstrate that the system works end-to-end.
