const express = require('express');
const db = require('../db'); // Assuming you have a database connection module

const teamRouter = express.Router();

teamRouter.get("/", async (req, res) => {
    const userID = req.body.userID;
    const role = req.body.role;

    try {
        if (role === "Project manager") {
            // Query to fetch team details, team members, tasks assigned to the team, and project names
            const query = `
            SELECT 
            teams.id AS teamID,
            teams.name AS teamName,
            projects.proName AS projectName,
            tasks.taskID,
            tasks.title AS taskTitle,
            tasks.description AS taskDescription,
            tasks.dueDate,
            tasks.priority,
            tasks.status,
            GROUP_CONCAT(users.name ORDER BY users.name ASC SEPARATOR ', ') AS teamMemberName
        FROM 
            teams
        LEFT JOIN 
            projects ON teams.projectID = projects.projectID
        LEFT JOIN 
            tasks ON projects.projectID = tasks.projectID
        LEFT JOIN 
            task_team_members ON tasks.taskID = task_team_members.taskID
        LEFT JOIN 
            users ON task_team_members.teamMemberID = users.id
        WHERE 
            projects.managerID = ?  -- Replace ? with the manager's ID
        GROUP BY 
            teams.id, tasks.taskID
        ORDER BY 
            teams.id, tasks.taskID;
         
            `;

            db.query(query, [userID], (err, results) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json("Internal Server Error 1");
                }
                console.log(results);
                res.status(200).json(results);
            });
        } else {
            const query1 = `
            SELECT 
            teams.id AS teamID,
            teams.name AS teamName,
            projects.proName AS projectName,
            tasks.taskID,
            tasks.title AS taskTitle,
            tasks.description AS taskDescription,
            tasks.dueDate,
            tasks.priority,
            tasks.status,
            users.name AS teamMemberName
        FROM 
            teams
        LEFT JOIN 
            projects ON teams.projectID = projects.projectID
        LEFT JOIN 
            tasks ON projects.projectID = tasks.projectID
        LEFT JOIN 
            teammembers ON teams.id = teammembers.teamID
        LEFT JOIN 
            users ON teammembers.userID = users.id
        WHERE 
            teams.id IN (SELECT teamID FROM teammembers WHERE userID = ?);
        
            `;

            db.query(query1, [userID], (err, results) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json("Internal Server Error 1");
                }
                console.log(results);
                res.status(200).json(results);
            });
        } 
        
    } catch (error) {
        console.error(error);
        res.status(500).json("Internal Server Error 1");
    }
});



teamRouter.post('/create', (req, res) => {
    const { name, members, projectID } = req.body;

    // Validate the request
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Team name is required.' });
    }

    // Create team record in the database
    const createTeamQuery = 'INSERT INTO teams (name, projectID) VALUES (?, ?)';
    db.query(createTeamQuery, [name, projectID], (err, teamResult) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        const teamID = teamResult.insertId;
        const teamMembers = [];

        // Add team members if provided
        if (members && members.length > 0) {
            const addMembersQuery = 'INSERT INTO teammembers (teamID, userID) VALUES (?, ?)';
            let membersProcessed = 0;

            members.forEach(memberID => {
                db.query(addMembersQuery, [teamID, memberID], (err, memberResult) => {
                    console.log(teamID,memberID)
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Internal Server Error 1' });
                    }

                    // Fetch member details from users table based on memberID
                    const getMemberQuery = 'SELECT name, email FROM users WHERE id = ?';
                    db.query(getMemberQuery, [memberID], (err, memberDetails) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: 'Internal Server Error 2' });
                        }

                        if (memberDetails && memberDetails.length > 0) {
                            const { name, email } = memberDetails[0];
                            // Add member details to the teamMembers array
                            teamMembers.push({ id: memberID, name, email });
                        }

                        membersProcessed++;

                        // If all members are processed, send the response
                        if (membersProcessed === members.length) {
                            // Prepare response
                            const teamResponse = {
                                id: teamID.toString(),
                                name,
                                projectID,
                                members: teamMembers
                            };
                            res.status(201).json(teamResponse);
                        }
                    });
                });
            });
        } else {
            // If there are no members, send the response immediately
            const teamResponse = {
                id: teamID.toString(),
                name,
                projectID,
                members: teamMembers
            };
            res.status(201).json(teamResponse);
        }
    });
});




teamRouter.put('update/:teamID', (req, res) => {
    const teamID = req.params.teamID;
    const { members,projectID } = req.body;

    // Validate the request
    if (!projectID || !members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty members array.' });
    }

    // Remove existing team members
    const removeMembersQuery = 'DELETE FROM teammembers WHERE teamID = ?';
    db.query(removeMembersQuery, [teamID], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal Server Error 1' });
        }

        // Add new team members
        const addMembersQuery = 'INSERT INTO teammembers (teamID, userID) VALUES (?, ?)';
        let membersProcessed = 0;

        members.forEach(memberID => {
            // Check if memberID exists in users table (perform validation)
            // ... (perform validation logic, if necessary)

            // Insert team member record
            db.query(addMembersQuery, [teamID, memberID], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Internal Server Error 2' });
                }

                membersProcessed++;

                // If all members are processed, retrieve updated team details
                if (membersProcessed === members.length) {
                    const getTeamDetailsQuery =
                    'SELECT teams.id AS teamID, teams.name AS teamName, teammembers.userID AS memberID, users.name AS memberName, users.email AS memberEmail FROM teams LEFT JOIN teammembers ON teams.id = teammembers.teamID LEFT JOIN users ON teammembers.userID = users.id WHERE teams.id = ?';
                    
                    db.query(getTeamDetailsQuery, [teamID], (err, teamDetailsResult) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: 'Internal Server Error' });
                        }

                        // Prepare response
                        const teamResponse = {
                            id: teamID.toString(),
                            name: teamDetailsResult[0].teamName,
                            projectID,
                            members: teamDetailsResult.map(member => {
                                return {
                                    id: member.memberID.toString(),
                                    name: member.memberName,
                                    email: member.memberEmail
                                };
                            })
                        };

                        res.status(200).json(teamResponse);
                    });
                }
            });
        });
    });
});


teamRouter.delete('/delete/:teamID', (req, res) => {
    const teamID = req.params.teamID;
    const authenticatedUserID = req.body.userID; // Assuming you have the authenticated user ID in req.user

    // Query to check if the authenticated user is the manager of the project associated with the team
    const checkManagerQuery = 'SELECT projects.managerID FROM projects INNER JOIN teams ON projects.projectID = teams.projectID WHERE teams.id = ?';
    
    db.query(checkManagerQuery, [teamID], (error, results) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        const project = results[0];
        if (!project || project.managerID !== authenticatedUserID) {
            return res.status(403).json({ error: 'Unauthorized access. Only managers can delete teams.' });
        }

        const deleteTeamMembersQuery = 'DELETE FROM teammembers WHERE teamID = ?';
        db.query(deleteTeamMembersQuery, [teamID], (error) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            // Delete the team from the teams table
            const deleteTeamQuery = 'DELETE FROM teams WHERE id = ?';
            db.query(deleteTeamQuery, [teamID], (error) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                // Send a success response
                res.status(200).send('Team deleted successfully.');
            });
        });

        // Send a success response
       
    });
});

module.exports = teamRouter;
