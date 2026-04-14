---
name: Activity log system
description: Global activity log with per-page panel and workflow event tracking
type: feature
---
ActivityLogContext provides a global event log with types: workflow, data, approval, system.
- Each LogEntry has: id, timestamp, type, route, user, message
- Seeded with demo entries across multiple routes
- WorkflowContext auto-logs: start session, complete step, complete session, leave session, close session
- ScreenFooter shows real log entries filtered by current route with slide-in panel
- Panel has type filters (Tất cả, Workflow, Dữ liệu, Phê duyệt, Hệ thống)
- Entries display with colored type icons and relative timestamps
