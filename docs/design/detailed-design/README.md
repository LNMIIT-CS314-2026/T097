# Detailed design and traceability

The release uses the following implementation choices for points left open in the team SRS. These choices are available for team or instructor review.

| SRS topic | Release behaviour |
| --- | --- |
| FR-025, REV-005 | Goal progress is the rounded, unweighted mean of linked initiative percentages. A goal without initiatives shows “No initiatives” or a dash. Filtered and departmental views use their visible initiatives. |
| FR-023/024, BR-005, REV-006 | For a positive target and a known current value, attainment is the rounded current-to-target percentage, capped at 100%. An empty input stays unknown. Reaching the target displays “Target met”. A KPI officer can specify a lower warning threshold. |
| FR-020, REV-007 | Planning and KPI officers can define initiative-linked KPIs. Owners can update the current value only on a KPI attached to their own initiative. |
| FR-019/027/035/036, REV-008 | Compare calendar dates in Asia/Kolkata. The due date itself is on time. Deadline alerts go to the owner and the relevant department head. The initial reminder window is seven days and an administrator can adjust it. |
| BR-002/003/010 | A new initiative needs an active goal. It can be Planned with no owner. Activation requires review and an assigned owner. Completion requires 100% initiative progress and completion of every required child milestone. |
| Lifecycle | The Assignment 7 “Planned” initial status carries the Assignment 5 draft review state. Submission, revision and approval are tracked separately from delivery progress. Approved work starts In Progress. Closed initiatives are read-only. |
| FR-004/005 | An administrator assigns one of the six SRS roles. Department and ownership further restrict the records available through that role. Local registered credentials implement login for this course installation. |
| FR-038–041 | Generated reports are dated snapshots scoped to the requesting user. The Reports page reopens the saved values and offers browser PDF printing and an XLSX workbook. |

| Requirements | Implementation |
| --- | --- |
| FR-001–005 | Cookie sessions, account creation and changes, fixed permission profiles, revocation and logout |
| FR-006–015 | Goal register, initiative register, owner assignment, review queue and owner progress form |
| FR-016–019 | Required and optional milestones with description, date, percentage, status and overdue identification |
| FR-020–024 | KPI register, linked initiatives, target/current values, thresholds and derived performance status |
| FR-025–034 | Read-only performance overview, goal/status filters, active delay checks and related-record drill-down |
| FR-035–037 | Deadline and delay checks, significant plan-change messages and recipient-specific read state |
| FR-038–041 | Scoped strategic-plan, initiative and KPI reports and management dashboard |

The remaining named workflows in the use-case catalogue are covered by department maintenance (UC-008), assigned initiative risks (UC-011), target configuration (UC-014), management review (UC-017), report export (UC-021) and notification rule configuration (UC-022). Historical sample KPIs with a known parent are migrated to it. Unrecognised goal-only KPIs retain their recorded goal until a planning or KPI officer assigns the correct initiative.
