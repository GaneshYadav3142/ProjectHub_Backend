const express=require("express")
const db = require("../db")
const authMiddleware = require("../Midddleware/AuthenticationMiddelware")
const taskRouter=express.Router()

taskRouter.post("/create", async (req, res) => {
    const { title, description, dueDate, priority, status, projectID, assignedTeamMembers } = req.body;
      const dueDate1=new Date(dueDate)
    try {
        // Insert task into the database
        const insertTaskQuery = "INSERT INTO tasks (title, description, dueDate, priority, status, projectID) VALUES (?, ?, ?, ?, ?, ?)";
        const taskValues = [title, description, dueDate1, priority, status, projectID];

        db.query(insertTaskQuery, taskValues, async (err, result) => {
            if (err) {
                return res.status(500).send("Internal Server Error");
            }

            // Insert assigned team members into the task_team_members table
            const taskID = result.insertId;
            const insertTeamMembersQuery = "INSERT INTO task_team_members (taskID, teamMemberID) VALUES ?";
            console.log(taskID,assignedTeamMembers)
            
            const teamMembersValues = assignedTeamMembers.map(memberID => [taskID, memberID]);
             console.log(teamMembersValues)
            db.query(insertTeamMembersQuery, [teamMembersValues], (err, teamMembersResult) => {
                if (err) {
                    return res.status(500).send("Internal Server Error 1");
                }

                // Fetch assigned team members' details
                const fetchTeamMembersQuery = "SELECT id, name, email FROM users WHERE id IN (?)";
                const teamMemberIDs = assignedTeamMembers.map(memberID => parseInt(memberID, 10));

                db.query(fetchTeamMembersQuery, [teamMemberIDs], (err, teamMembersDetails) => {
                    if (err) {
                        return res.status(500).send("Internal Server Error");
                    }

                    const assignedTeamMembersInfo = teamMembersDetails.map(member => ({
                        id: member.id.toString(),
                        name: member.name,
                        email: member.email
                    }));

                    // Prepare the response
                    const response = {
                        id: taskID.toString(),
                        title,
                        description,
                        dueDate,
                        priority,
                        status,
                        assignedTeamMembers: assignedTeamMembersInfo
                    };

                    res.status(201).json(response);
                });
            });
        });
    } catch (error) {
        // Handle errors here
        res.status(500).send("Internal Server Error");
    }
});

taskRouter.put("/:taskID", async (req, res) => {
    const taskID = parseInt(req.params.taskID, 10);
    const { title, description, dueDate, priority, status, projectID, assignedTeamMembers } = req.body;
     const dueDate2=new Date(dueDate)
    try {
        // Remove existing team member assignments for the current task
        const deleteAssignmentsQuery = "DELETE FROM task_team_members WHERE taskID = ?";
        db.query(deleteAssignmentsQuery, [taskID], (err, deleteResult) => {
            if (err) {
                return res.status(500).send("Internal Server Error 1");
            }

            // Insert new team member assignments
            const insertAssignmentsQuery = "INSERT INTO task_team_members (taskID, teamMemberID) VALUES ?";
            const teamMembersValues = assignedTeamMembers.map(memberID => [taskID, memberID]);
            db.query(insertAssignmentsQuery, [teamMembersValues], (err, insertResult) => {
                if (err) {
                    return res.status(500).send("Internal Server Error 2");
                }

                // Update task details in the database
                const updateTaskQuery = `
                    UPDATE tasks
                    SET title = ?, description = ?, dueDate = ?, priority = ?, status = ?, projectID = ?
                    WHERE taskID = ?;
                `;
                const taskValues = [title, description, dueDate2, priority, status, projectID, taskID];
                db.query(updateTaskQuery, taskValues, (err, updateResult) => {
                    if (err) {
                        return res.status(500).send("Internal Server Error 3");
                    }

                    // Fetch team members' details based on their IDs
                    const fetchTeamMembersQuery = "SELECT id, name, email FROM users WHERE id IN (?)";
                    const teamMembersIDs = assignedTeamMembers.map(memberID => memberID);
                    db.query(fetchTeamMembersQuery, [teamMembersIDs], (err, teamMembers) => {
                        if (err) {
                            return res.status(500).send("Internal Server Error 4");
                        }

                        // Prepare the response
                        const response = {
                            id: taskID,
                            title,
                            description,
                            dueDate,
                            priority,
                            status,
                            assignedTeamMembers: teamMembers /* Fetched assigned team members' details */
                        };
                        res.status(200).json(response);
                    });
                });
            });
        });
    } catch (error) {
        // Handle other errors here
        res.status(500).send("Internal Server Error 5");
    }
});



taskRouter.patch("/:taskID", async (req, res) => {
    const taskID = parseInt(req.params.taskID, 10);
    const updatedFields = req.body;

    // Create an array to store the values for the SET clause in the SQL query
    const updateValues = [];
    const updateFields = [];

    // Iterate through the updatedFields object and build the SET clause for the SQL query
    for (const key in updatedFields) {
        // Ensure the key is a valid field in your tasks table to prevent SQL injection
        if (key === "title" || key === "description" || key === "dueDate" || key === "priority" || key === "status" || key === "projectID") {
            updateFields.push(`${key} = ?`);
            updateValues.push(updatedFields[key]);
        }
    }

    // Check if any valid fields were provided in the request
    if (updateFields.length === 0) {
        return res.status(400).send("No valid fields provided for update.");
    }

    // Construct the SQL query dynamically based on the provided fields
    const updateTaskQuery = `
        UPDATE tasks
        SET ${updateFields.join(", ")}
        WHERE taskID = ?;
    `;
    updateValues.push(taskID);

    try {
        // Execute the update query
        db.query(updateTaskQuery, updateValues, (err, updateResult) => {
            if (err) {
                return res.status(500).send("Internal Server Error 1");
            }

            // Fetch and return the updated task from the database
            const fetchUpdatedTaskQuery = "SELECT * FROM tasks WHERE taskID = ?";
            db.query(fetchUpdatedTaskQuery, [taskID], (err, task) => {
                if (err) {
                    return res.status(500).send("Internal Server Error 2");
                }

                res.status(200).json(task[0]);
            });
        });
    } catch (error) {
        // Handle other errors here
        res.status(500).send("Internal Server Error 3");
    }
});



taskRouter.delete("/:taskID", async (req, res) => {
    const taskID = req.params.taskID;

    try {
        // Start a database transaction
        db.beginTransaction(async (err) => {
            if (err) {
                return res.status(500).send("Internal Server Error");
            }

            try {
                // Delete team member assignments associated with the task
                const deleteAssignmentsQuery = "DELETE FROM task_team_members WHERE taskID = ?";
                 db.query(deleteAssignmentsQuery, [taskID]);

                // Delete the task
                const deleteTaskQuery = "DELETE FROM tasks WHERE taskID = ?";
                 db.query(deleteTaskQuery, [taskID]);

                // Commit the transaction
                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).send("Internal Server Error 1");
                        });
                    }

                    // Send a success response
                    res.status(200).json({ msg: "Task deleted successfully" });
                });
            } catch (error) {
                // Rollback the transaction on error
                db.rollback(() => {
                    res.status(500).send("Internal Server Error");
                });
            }
        });
    } catch (error) {
        // Handle other errors here
        res.status(500).send("Internal Server Error");
    }
});


taskRouter.get("/", async (req,res)=>{
    const userID=req.body.userID;

    const role=req.body.role
    console.log(userID,role)
    try {
        if (role==="Team member"){
    const query1=`SELECT 
    t.taskID,
    t.title AS taskTitle,
    t.description AS taskDescription,
    t.dueDate,
    t.priority,
    t.status,
    p.proName AS projectName,
    ttm.teamMemberID,
    u.name AS teamMemberName
FROM 
    tasks t
JOIN 
    task_team_members ttm ON t.taskID = ttm.taskID
JOIN 
    projects p ON t.projectID = p.projectID
JOIN 
    task_team_members ttm2 ON t.taskID = ttm2.taskID
JOIN 
    users u ON ttm2.teamMemberID = u.id
WHERE 
    ttm.teamMemberID = ? AND ttm2.teamMemberID != ?;

`
 db.query(query1,[userID,userID], (err, results)=>{
    console.log(err,results)
    if(err){
        res.status(400).json("Internal server Error 1")
    }
    console.log(results )
    res.status(200).json(results)
 })
    }
else {
    const query2=`SELECT 
    t.taskID,
    t.title AS taskTitle,
    t.description AS taskDescription,
    t.dueDate,
    t.priority,
    t.status,
    p.proName AS projectName,
    GROUP_CONCAT(DISTINCT ttm.teamMemberID ORDER BY ttm.teamMemberID) AS teamMemberID,
    GROUP_CONCAT(DISTINCT u.name ORDER BY ttm.teamMemberID) AS teamMemberName
FROM 
    tasks t
JOIN 
    task_team_members ttm ON t.taskID = ttm.taskID
JOIN 
    projects p ON t.projectID = p.projectID
JOIN 
    users u ON ttm.teamMemberID = u.id
WHERE 
    p.managerID = ?
GROUP BY
    t.taskID, t.title, t.description, t.dueDate, t.priority, t.status, p.proName;
 ;
`
 db.query(query2,userID, (err, results)=>{
    console.log(err,results)
    if(err){
        res.status(400).json("Internal server Error 1")
    }
    console.log(results )
    res.status(200).json(results)
 })
}

} catch (error) {
        res.status(400).json(" Error")
    }
})




















module.exports=taskRouter