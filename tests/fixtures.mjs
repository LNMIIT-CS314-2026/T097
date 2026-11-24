// Assignment 8, TD-01 to TD-03. Call only with the disposable integration database.
export const creation = {
  title: 'AI Research Lab Extension',
  description: 'Extend existing research facilities',
  goalId: 1,
  ownerId: 2,
  startDate: '2026-11-20',
  dueDate: '2026-12-31',
};
export function restoreFixture(db) {
  db.exec(`
    DROP TRIGGER IF EXISTS simulate_save_failure;
    DELETE FROM reports; DELETE FROM audit; DELETE FROM risks; DELETE FROM notifications; DELETE FROM progress_updates;
    DELETE FROM milestones; DELETE FROM kpis; DELETE FROM initiatives; DELETE FROM strategic_goals;
    INSERT INTO strategic_goals(id,title,target_date,status) VALUES
      (1,'Enhance Research Output','2026-12-31','Active'),(2,'Improve Laboratory Infrastructure','2026-12-31','Active');
    INSERT INTO initiatives(id,title,description,goal_id,owner_id,start_date,due_date,progress,status,created_at,updated_at,review) VALUES
      (1,'AI Research Lab Setup','Research equipment',1,2,'2026-11-01','2026-11-30',60,'In Progress','2026-11-01','2026-11-01','Approved'),
      (2,'Faculty Research Programme','Faculty publications',1,4,'2026-11-01','2026-11-30',30,'In Progress','2026-11-01','2026-11-01','Approved'),
      (3,'Laboratory Infrastructure Upgrade','Lab upgrade',2,2,'2026-11-01','2026-11-18',70,'In Progress','2026-11-01','2026-11-01','Approved'),
      (4,'Completed Research Workshop','Research workshop',1,2,'2026-11-01','2026-11-18',100,'Completed','2026-11-01','2026-11-01','Approved');
    INSERT INTO milestones(id,initiative_id,title,due_date,progress,status) VALUES
      (1,1,'Purchase Equipment','2026-11-10',100,'Completed'),(2,1,'Install and Configure','2026-11-25',40,'In Progress'),
      (3,3,'Complete Laboratory Upgrade','2026-11-18',70,'In Progress'),(4,4,'Complete Research Workshop','2026-11-17',100,'Completed');
    INSERT INTO kpis(id,goal_id,initiative_id,name,target_value,current_value,unit) VALUES
      (1,1,1,'Research Papers',10,6,'Papers'),(2,1,2,'Faculty Publications',20,10,'Publications'),(3,2,3,'Laboratories Upgraded',5,3,'Laboratories');
  `);
}
