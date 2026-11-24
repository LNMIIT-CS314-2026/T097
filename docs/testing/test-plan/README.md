# Test plan

The team's Assignment 8 test design supplies 40 numbered scenarios across three detailed use cases.

The automated integration suite exercises the actual Express routes and SQLite persistence. TD-01 to TD-03 are recreated for each case. Logical users are mapped to registered roles and ownership rather than assuming the SRS's example identifiers are database keys. The controlled reference date is 19 November 2026 in the campus time zone. Numeric expectations use the [documented calculation choices](../../design/detailed-design/README.md).

TC-012 injects a SQLite write failure into the isolated fixture. TC-040 temporarily makes the KPI table unavailable. The suite checks returned errors, rollback and the availability of unaffected data. Supplementary cases exercise multiple roles, concurrent saves, report snapshots, account changes, reminder de-duplication and Excel output.

A separate browser run drives the compiled React app using seeded accounts on another temporary database. It covers UI-01 to UI-06, all six roles, desktop and narrow-screen navigation, report printing and downloads. The suite checks functional behaviour. Classroom-scale observations do not establish an uptime or capacity guarantee.
