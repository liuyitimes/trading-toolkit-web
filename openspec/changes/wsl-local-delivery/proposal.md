# WSL Local Delivery

## Why

The WSL deployment currently depends on an unversioned launcher and manually started development servers. It has no build gate, managed lifecycle, health check, or safe handling of the service repository's local SQLite database.

## What Changes

- Add a versioned WSL control script and systemd user-service template.
- Gate deployment on Web build and browser verification, then restart managed services and check both HTTP listeners.
- Preserve the service SQLite database and refuse deployment when any other service working-tree change is present.

## Scope

This is a local WSL deployment workflow only. It does not replace GitHub Actions, change APIs, or push/deploy to a cloud provider.
