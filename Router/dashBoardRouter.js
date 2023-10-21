const express = require('express');
const db = require('../db'); // Assuming you have a database connection module
const authMiddleware = require('../Midddleware/AuthenticationMiddelware'); // Assuming you have an authentication middleware

const dashboardRouter = express.Router();

// Middleware to ensure authentication before accessing the dashboard
dashboardRouter.use(authMiddleware);



dashboardRouter.get('/', (req, res) => {
    const userID1 = req.body.userID;
    const role=req.body.role
    console.log(userID1,role)
    if(role==="Team member"){
    // Fetch tasks assigned to the team member
    const tasksQuery1 = `SELECT 
    tasks.taskID AS taskID, 
    tasks.title AS title, 
    tasks.description AS description, 
    tasks.dueDate AS dueDate, 
    tasks.priority AS priority, 
    tasks.status AS status,
    projects.proName AS proName,
    teams.name AS name
FROM tasks
LEFT JOIN projects ON tasks.projectID = projects.projectID
LEFT JOIN task_team_members ON tasks.taskID = task_team_members.taskID
LEFT JOIN teams ON tasks.projectID = teams.projectID
WHERE task_team_members.teamMemberID = ? OR tasks.projectID = ?;

;

`;
    db.query(tasksQuery1, [userID1,userID1], (tasksError, tasks) => {
        if (tasksError) {
            console.error(tasksError);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
          const task=tasks
            const tasksQuery2 = `SELECT 
            projects.projectID, 
            projects.proName, 
            projects.description, 
            projects.srtDate, 
            projects.endDate, 
            teams.id AS teamID, 
            teams.name AS teamName, 
            users.name AS managerName
        FROM projects
        LEFT JOIN teams ON projects.projectID = teams.projectID
        LEFT JOIN teammembers ON teams.id = teammembers.teamID
        LEFT JOIN users ON projects.managerID = users.id
        WHERE teammembers.userID = ?;
        `;
            db.query(tasksQuery2, [userID1], (tasksError, projects) => {
                if (tasksError) {
                    console.error(tasksError);
                    res.status(500).json({ error: 'Internal Server Error' });
                }
                const teamsQuery3 = `
                SELECT 
    teams.id AS teamID, 
    teams.name AS teamName, 
    GROUP_CONCAT(users.name) AS teamMembers
FROM teams
LEFT JOIN teammembers ON teams.id = teammembers.teamID
LEFT JOIN users ON teammembers.userID = users.id
WHERE teams.id IN (
    SELECT teamID
    FROM teammembers
    WHERE userID = ?
)
GROUP BY teams.id;

            `;
            
            db.query(teamsQuery3, [userID1], (error, teams) => {
                if (error) {
                    console.error(error);
                    // Handle the error
                }

            res.status(200).json({ tasks,projects ,teams});
            })
    });
}})
    }
    if(role==="Project manager"){

        const tasksQuery4 = `SELECT 
        tasks.taskID AS taskID, 
        tasks.title, 
        tasks.description, 
        tasks.dueDate, 
        tasks.status, 
        tasks.priority, 
        projects.proName,
        teams.id,
        teams.name
    FROM tasks 
    LEFT JOIN projects ON tasks.projectID = projects.projectID 
    LEFT JOIN teams ON projects.projectID = teams.projectID
    WHERE projects.managerID = ?;
    `;
    db.query(tasksQuery4, [userID1], (tasksError, tasks) => {
        if (tasksError) {
            console.error(tasksError);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            const projectsQuery = `
            SELECT DISTINCT
            projects.projectID, 
            projects.proName, 
            projects.description, 
            projects.srtDate, 
            projects.endDate, 
            teams.id AS teamID, 
            teams.name AS teamName,
            users.name AS managerName
        FROM projects
        LEFT JOIN teams ON projects.projectID = teams.projectID
        LEFT JOIN teammembers ON teams.id = teammembers.teamID
        LEFT JOIN users ON projects.managerID = users.id
        WHERE projects.managerID = ?;
        `;
            db.query(projectsQuery, [userID1], (projectsError, projects) => {
                if (projectsError) {
                    console.error(projectsError);
                    res.status(500).json({ error: 'Internal Server Error' });
                } else {
                    console.log(projects)
                    const teamsQuery = `
                    SELECT 
    teams.id AS teamID, 
    teams.name AS teamName, 
    GROUP_CONCAT(users.name) AS teamMembers
FROM teams
LEFT JOIN teammembers ON teams.id = teammembers.teamID
LEFT JOIN users ON teammembers.userID = users.id
WHERE teams.projectID IN (
    SELECT projectID
    FROM projects
    WHERE managerID = ?
)
GROUP BY teams.id;

                    `;

                    db.query(teamsQuery, [userID1], (teamsError, teams) => {
                        console.log(teams)
                        if (teamsError) {
                            console.error(teamsError);
                            res.status(500).json({ error: 'Internal Server Error' });
                        } else {
                            res.status(200).json({ tasks, projects, teams });
                        }
                    });
                }
            });
        }
    });
    }
});

module.exports = dashboardRouter;
