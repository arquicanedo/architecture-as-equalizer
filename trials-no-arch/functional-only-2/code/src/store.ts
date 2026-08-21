import { User, Project, Task, Comment, Notification } from "./types";

class Store {
  users: Map<string, User> = new Map();
  projects: Map<string, Project> = new Map();
  tasks: Map<string, Task> = new Map();
  comments: Map<string, Comment> = new Map();
  notifications: Map<string, Notification> = new Map();
}

export const store = new Store();
