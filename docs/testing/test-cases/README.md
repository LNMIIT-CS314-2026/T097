# Test cases

The exact inputs, steps, use-case IDs, requirement IDs and expected results are preserved on pages 102–128 of the [team test design](../../requirements/SRS/T097.pdf#page=102). Pages 146–153 contain the team's traceability matrix.

| Detailed use case | Test IDs | Checks |
| --- | --- | --- |
| UC-006 Manage Strategic Initiative | TC-001–012 | Login, creation, editing, goal/owner validation, date order, pre-active ownership, permissions and write failure |
| UC-009 Update Initiative Progress | TC-013–027 | Persistence, numeric boundaries, ownership, authentication, status, atomic child updates, required milestone completion and delayed progress |
| UC-015 Monitor Strategic Plan Performance | TC-028–040 | Aggregate progress, KPI comparisons, missing values, deadline boundaries, empty data, filters, management access, linked details and partial retrieval failure |

Every numbered case has the same ID in [the executable suite](../../../tests/project.test.mjs) and the [run output](../test-results/integration.tap). The browser workflow uses the [compiled application](../../../tests/browser.mjs).
