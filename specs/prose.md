# Task Management API — Architecture Description

## Overview

We are building a task management API system using TypeScript and Node.js. The system allows users to create projects, manage tasks within those projects, add comments to tasks, and receive notifications about relevant changes. Everything runs in-memory — there is no database or external service dependency. The system uses a simple HTTP server built with Node.js's built-in `http` module (no Express or other frameworks).

## Components

The system is made up of several services, each responsible for a specific domain. There is a User Service that handles creating, retrieving, updating, and deleting users. Each user has an id, name, and email. The User Service stores all user data in memory.

There is a Project Service that manages projects. A project has an id, name, description, and a list of member user IDs. The Project Service allows creating projects, adding and removing members, and the usual CRUD operations. It stores its own data in memory, separate from the other services.

The Task Service handles tasks. A task belongs to a project and has an id, title, description, status, assignee (a user ID), and the project ID it belongs to. Tasks go through status transitions: they start as "todo", can move to "in-progress", and then to "done". The Task Service validates that status transitions follow this order — you can't go from "done" back to "todo", for instance. The Task Service stores its own data in memory.

The Comment Service manages comments on tasks. A comment has an id, the task ID it belongs to, the author's user ID, a text body, and a creation timestamp. Comments are stored in memory within the Comment Service.

The Notification Service maintains a list of notifications for users. A notification has an id, the target user ID, a message string, a read/unread flag, and a timestamp. The Notification Service listens for events and creates notifications for relevant users.

## Communication Between Services

Services should not call each other directly. Instead, we use a simple in-memory Event Bus — a publish/subscribe system. When something notable happens (like a task being assigned, a comment being added, or a task status changing), the originating service publishes an event to the Event Bus. Other services that care about those events subscribe to them and react accordingly.

For example, when a task is assigned to a user, the Task Service publishes a "task.assigned" event. The Notification Service subscribes to this event and creates a notification for the assigned user. Similarly, when a comment is added to a task, the Comment Service publishes a "comment.added" event, and the Notification Service creates a notification for the task's assignee.

The Event Bus is a simple class that allows publishing events with a name and payload, and subscribing to events by name with a callback function.

## API Layer

All external HTTP requests come in through an API Router. The router parses incoming HTTP requests, determines which service should handle them based on the URL path, and delegates accordingly. The router is the only component that directly calls service methods — services never handle HTTP directly.

The API should support these routes:

- Users: GET/POST /users, GET/PUT/DELETE /users/:id
- Projects: GET/POST /projects, GET/PUT/DELETE /projects/:id, POST/DELETE /projects/:id/members
- Tasks: GET/POST /tasks (filtered by project), GET/PUT/DELETE /tasks/:id, PUT /tasks/:id/status, PUT /tasks/:id/assign
- Comments: GET/POST /comments (filtered by task), GET/DELETE /comments/:id
- Notifications: GET /notifications (filtered by user), PUT /notifications/:id/read

All request and response bodies use JSON.

## Data Ownership

Each service owns its data exclusively. The User Service is the only place user data lives. The Task Service is the only place task data lives. No service should directly access another service's internal data store. If a service needs information from another service's domain, it should either receive it through event payloads or the API router should orchestrate the necessary lookups.

## Design Rationale

We chose an event-driven architecture for inter-service communication to keep services decoupled. This makes it easier to add new services later (they just subscribe to existing events) and prevents tight coupling that would make the system harder to modify. Each service owning its own data prevents the kind of shared-state bugs that arise when multiple components read and write the same data structures. The simple in-memory approach keeps the system self-contained and easy to run — no setup required beyond having Node.js installed.

## File Structure

Organize the code with a clear separation between the event bus, individual services, the API router, and the main entry point. Each service should be in its own file. The event bus should be in its own file. The router should be in its own file. The main entry point should wire everything together, set up event subscriptions, and start the HTTP server.

## Demo Script

Include a demo script that starts the server and runs through the main features: creates users, creates a project, adds members, creates tasks, assigns tasks, adds comments, and checks notifications. This should demonstrate that the system works end-to-end.
