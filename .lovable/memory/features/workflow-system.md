---
name: Workflow system
description: Daily/monthly workflow with step dependencies, session tracking, navigation guards
type: feature
---
WorkflowContext manages daily (3 steps) and monthly (3 steps) workflows with:
- Step dependency enforcement: step N requires step N-1 completed
- Session timer: tracks elapsed time from startWorkflow
- completedSteps array: tracks which steps are done
- Navigation guard: requestLeave() shows confirmation dialog when navigating outside workflow routes
- WorkflowLeaveDialog: modal confirming leave with progress visualization
- WorkflowBar: professional stepper with numbered indicators, lock icons, progress bar, session timer
- Workspace cards show inline step progress with ActiveWorkflowProgress component
