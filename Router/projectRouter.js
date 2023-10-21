const express=require("express")
const db = require("../db")
const authMiddleware = require("../Midddleware/AuthenticationMiddelware")
const projectRouter=express.Router()

projectRouter.get('/', authMiddleware, async (req, res) => {
    const managerID = req.body.userID;
    const role=req.body.role
    try {
        if(role==="Team member"){
            const getProjectsQuery = `SELECT DISTINCT
            projects.projectID,
            projects.proName,
            projects.description,
            projects.srtDate,
            projects.endDate,
            users.name AS managerName
        FROM projects
        LEFT JOIN tasks ON projects.projectID = tasks.projectID
        LEFT JOIN task_team_members ON tasks.taskID = task_team_members.taskID
        LEFT JOIN users ON projects.managerID = users.id
        WHERE tasks.projectID IS NOT NULL AND (task_team_members.teamMemberID = ? OR projects.managerID = ?);
        
        `;
            
            db.query(getProjectsQuery, [managerID,managerID], (err, results) => {
                console.log(err,results)
              if (err) {
                return res.status(500).send('Internal Server Error');
              }
              res.json(results);
            });
        }
        else{
            const getProjectsQuery = `SELECT * FROM projects WHERE managerID = ?`;
            
            db.query(getProjectsQuery, [managerID], (err, results) => {
                console.log(err,results)
              if (err) {
                return res.status(500).send('Internal Server Error');
              }
              res.json(results);
            });
        }
    } catch (error) {
        
    }
    
  });

projectRouter.post("/create",authMiddleware,async(req,res)=>{
       const {proName,description,srtDate,endDate}=req.body
       const managerID=req.body.userID
        const srtDate1 = new Date(srtDate);
      const endDate1 = new Date(endDate)
       console.log(req.body,managerID,srtDate,endDate)
    try {
        db.query("SELECT role FROM users WHERE id = ?", managerID, (err, roleResult) => {
            if (err) {
                return res.status(500).send("Internal Server Error 1");
            }

            const userRole = roleResult[0].role;

            // If the user is a team member, deny project creation
            if (userRole === "Team member") {
                return res.status(403).json({ error: "Team members are not allowed to create projects" });
            }

        db.query("SELECT * FROM projects WHERE proNAME = ?",proName,(err,results)=>{
            if (err) {
                return res.status(500).send("Internal Server Error 2");
            }
            if(results.length){
                res.status(400).send({msg:"Project  Already Exist"})
           }
             else{
                db.query("INSERT INTO projects SET ?",{proName,description,srtDate:srtDate1,endDate:endDate1,managerID:managerID},(err,result)=>{
                    if(err){
                        res.status(400).send({err:"error creating projects"})
                    }else{
                        db.query("SELECT * FROM users WHERE id = ?", managerID, (err, managerResult) => {
                            if (err) {
                                return res.status(500).send("Internal Server Error 3");
                            }
                            const manager = managerResult[0]; // Assuming managerResult returns a single user
                            const project = {
                                id: result.insertId,
                                name: proName,
                                description: description,
                                startDate: srtDate1,
                                endDate: endDate1,
                                manager: {
                                    id: manager.id,
                                    name: manager.name,
                                    email: manager.email
                                }
                           };
                            res.status(200).json(project);
                    
                    })
                }
                })
            }
        })
    })
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
})


projectRouter.get("/:projectId", authMiddleware, async (req, res) => {
    const projectId = req.params.projectId;
    console.log(projectId)
    const managerID = req.body.userID;
    const role=req.body.role // Get managerID from authenticated user's token
       
    try {
        // Check if the user is the manager of the project
        if(role!=="Team member"){
        const projectQuery = "SELECT * FROM projects WHERE projectID = ? AND managerID = ?";
        db.query(projectQuery, [projectId, managerID], async (err, projectResults) => {
            if (err) {
                return res.status(500).send("Internal Server Error");
            }

            if (projectResults.length === 0) {
                return res.status(404).send("Project not found or you don't have access to this project.");
            }

            const project = projectResults[0];
            //res.json(project)
            const tasksQuery = "SELECT * FROM tasks WHERE projectID = ?";
            db.query(tasksQuery, [projectId], async (err, tasksResults) => {
                console.log(err,tasksResults)
                if (err) {
                   return  res.status(500).send("Internal Server Error ");
                }
               if(tasksResults.length===0){

                db.query("SELECT * FROM users WHERE id = ?", managerID, (err, managerResult) => {
                    if (err) {
                        return res.status(500).send("Internal Server Error");
                    }
                    const manager = managerResult[0]
                    const response1 = {
                        id: project.projectID,
                        name: project.proName,
                        description: project.description,
                        startDate: project.srtDate,
                        endDate: project.endDate,
                        manager: {
                            id: manager.id,
                            name: manager.name,
                            email: manager.email,
                            role:manager.role
                        },
                        tasks: []
                    };
                 return res.status(200).json(response1);
                })
               
               }
               //console.log("tasks",tasksResults)
               else{
                const tasks = await Promise.all(tasksResults.map(async task => {
                    const assignedMembersQuery = "SELECT * FROM users WHERE id IN (SELECT teamMemberID FROM task_team_members WHERE taskID = ?)";
                    const assignedMembers = await new Promise((resolve, reject) => {
                        db.query(assignedMembersQuery, [task.taskID], (err, membersResults) => {
                            if (err) {
                                reject(err);
                            }
                            resolve(membersResults);
                        });
                    });

                    return {
                        id: task.taskID,
                        title: task.title,
                        description: task.description,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        status: task.status,
                        assignedTeamMembers: assignedMembers.map(member => ({
                            id: member.id,
                            name: member.name,
                            email: member.email
                        }))
                    };
                }));
                db.query("SELECT * FROM users WHERE id = ?", managerID, (err, managerResult) => {
                    if (err) {
                        return res.status(500).send("Internal Server Error");
                    }
                    const manager = managerResult[0]
                const response = {
                    id: project.projectID,
                    name: project.proName,
                    description: project.description,
                    startDate: project.srtDate,
                    endDate: project.endDate,
                    manager: {
                        id: project.managerID,
                        name: manager.name,
                        email: manager.email,
                        role:manager.role
                    },
                    tasks: tasks
                };

                res.status(200).json(response);
            })
        }
            });
        });
    }
    else {
        const projectQuery = "SELECT * FROM projects WHERE projectID = ? ";
        db.query(projectQuery, [projectId], async (err, projectResults) => {
            if (err) {
                return res.status(500).send("Internal Server Error");
            }

            if (projectResults.length === 0) {
                return res.status(404).send("Project not found or you don't have access to this project.");
            }

            const project = projectResults[0];
            //res.json(project)
            const tasksQuery = "SELECT * FROM tasks WHERE projectID = ?";
            db.query(tasksQuery, [projectId], async (err, tasksResults) => {
                console.log(err,tasksResults)
                if (err) {
                   return  res.status(500).send("Internal Server Error ");
                }
               if(tasksResults.length===0){

                db.query("SELECT * FROM users WHERE id = ?", managerID, (err, managerResult) => {
                    if (err) {
                        return res.status(500).send("Internal Server Error");
                    }
                    const manager = managerResult[0]
                    const response1 = {
                        id: project.projectID,
                        name: project.proName,
                        description: project.description,
                        startDate: project.srtDate,
                        endDate: project.endDate,
                        manager: {
                            id: manager.id,
                            name: manager.name,
                            email: manager.email,
                            role:manager.role
                        },
                        tasks: []
                    };
                 return res.status(200).json(response1);
                })
               
               }
               //console.log("tasks",tasksResults)
               else{
                const tasks = await Promise.all(tasksResults.map(async task => {
                    const assignedMembersQuery = "SELECT * FROM users WHERE id IN (SELECT teamMemberID FROM task_team_members WHERE taskID = ?)";
                    const assignedMembers = await new Promise((resolve, reject) => {
                        db.query(assignedMembersQuery, [task.taskID], (err, membersResults) => {
                            if (err) {
                                reject(err);
                            }
                            resolve(membersResults);
                        });
                    });

                    return {
                        id: task.taskID,
                        title: task.title,
                        description: task.description,
                        dueDate: task.dueDate,
                        priority: task.priority,
                        status: task.status,
                        assignedTeamMembers: assignedMembers.map(member => ({
                            id: member.id,
                            name: member.name,
                            email: member.email
                        }))
                    };
                }));
                db.query("SELECT * FROM users WHERE id = ?", managerID, (err, managerResult) => {
                    if (err) {
                        return res.status(500).send("Internal Server Error");
                    }
                    const manager = managerResult[0]
                const response = {
                    id: project.projectID,
                    name: project.proName,
                    description: project.description,
                    startDate: project.srtDate,
                    endDate: project.endDate,
                    manager: {
                        id: project.managerID,
                        name: manager.name,
                        email: manager.email,
                        role:manager.role
                    },
                    tasks: tasks
                };

                res.status(200).json(response);
            })
        }
            });
        });
    }

} catch (error) {
        // Handle errors here
        res.status(500).send("Internal Server Error");
    }
});



projectRouter.patch("/:projectId", authMiddleware, async (req, res) => {
    const projectId = req.params.projectId;
    const managerID = req.body.userID; // Get managerID from authenticated user's token
    const { proName, description, startDate, endDate, managerID: newManagerID } = req.body;
     console.log(req.body)
    const startDate1 = new Date(startDate);
     const    endDate1 = new Date(endDate)
         console.log(startDate1,endDate1)
    try {

        
        // Check if the user is the manager of the project
        const projectQuery = "SELECT * FROM projects WHERE projectID = ? AND managerID = ?";
        db.query(projectQuery, [projectId, managerID], (err, projectResults) => {
            if (err) {
                return res.status(500).send("Internal Server Error");
            }

            if (projectResults.length === 0) {
                return res.status(404).send("Project not found or you don't have access to this project.");
            }

            // Update specific fields of the project if the user has access
            const updateFields = [];
            const updateValues = [];

            if (proName) {
                updateFields.push("proName");
                updateValues.push(proName);
            }

            if (description) {
                updateFields.push("description");
                updateValues.push(description);
            }

            if (startDate) {
                updateFields.push("srtDate");
                updateValues.push(startDate1);
            }

            if (endDate) {
                updateFields.push("endDate");
                updateValues.push(endDate1);
            }

            if (newManagerID) {
                updateFields.push("managerID");
                updateValues.push(newManagerID);
            }

            // Construct the update query based on provided fields
            const updateProjectQuery = `UPDATE projects SET ${updateFields.map(field => `${field} = ?`).join(", ")} WHERE projectID = ?`;
            const updateParams = [...updateValues, projectId];

            db.query(updateProjectQuery, updateParams, (err, updateResult) => {
                if (err) {
                    return res.status(400).send("Error updating project details.");
                }

                // Fetch updated project details
                const fetchUpdatedProjectQuery = "SELECT * FROM projects WHERE projectID = ?";
                db.query(fetchUpdatedProjectQuery, [projectId], (err, updatedProjectResults) => {
                    if (err) {
                        return res.status(500).send("Internal Server Error");
                    }

                    const updatedProject = updatedProjectResults[0];
                    console.log(updatedProject)
                    db.query("SELECT * FROM users WHERE id = ?", managerID, (err, managerResult) => {
                        if (err) {
                            return res.status(500).send("Internal Server Error");
                        }
                        const manager = managerResult[0]
                  
                    const response = {
                        id: updatedProject.projectID,
                        name: updatedProject.proName,
                        description: updatedProject.description,
                        startDate: updatedProject.srtDate,
                        endDate: updatedProject.endDate,
                        manager: {
                            id: manager.id,
                            name: manager.name,
                            email: manager.email,
                            role:manager.role
                        }
                    };

                    res.status(200).json(response);
                })
                });
            });
        });
    } catch (error) {
        // Handle errors here
        res.status(500).send("Internal Server Error");
    }
});



projectRouter.delete("/:projectId", authMiddleware, async (req, res) => {
    const projectId = req.params.projectId;
    const managerID = req.body.userID; // Get managerID from authenticated user's token
      console.log("manager",managerID)
    try {
        // Check if the user is the manager of the project
        db.query("SELECT * FROM projects WHERE projectID = ? AND managerID = ?", [projectId, managerID], (err, projectResults) => {
            if (err) {
                return res.status(500).send("Internal Server Error");
            }

            if (projectResults.length === 0) {
                return res.status(404).send("Project not found or you don't have access to delete this project.");
            }

            // Delete tasks associated with the project
            db.query("DELETE FROM tasks WHERE projectID = ?", projectId, (err) => {
                if (err) {
                    return res.status(500).send("Error deleting tasks related to the project.");
                }

                // Delete team members associated with the project
                db.query("DELETE FROM task_team_members WHERE taskID IN (SELECT taskID FROM tasks WHERE projectID = ?)", projectId, (err) => {
                    if (err) {
                        return res.status(500).send("Error deleting team members related to the project.");
                    }

                    // Delete the project itself
                    db.query("DELETE FROM projects WHERE projectID = ?", projectId, (err) => {
                        if (err) {
                            return res.status(500).send("Error deleting the project.");
                        }

                        res.status(200).json({ message: "Project and related details deleted successfully." });
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
});








module.exports=projectRouter