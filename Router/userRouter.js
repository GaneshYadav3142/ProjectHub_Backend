const express=require("express")
const userRouter=express.Router()
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")
const db=require("../db")
const authMiddleware = require("../Midddleware/AuthenticationMiddelware")

userRouter.post("/register",async(req,res)=>{
    const {name,email,password,role}=req.body
   
    console.log(req.body)
    try {
        if(!name || !email || !password || !role){

            res.status(400).send("Please fill all details")
           }
      db.query("SELECT * FROM users WHERE email = ?",email,async (err,result)=>{
        console.log(result)
        if (err) {
            return res.status(500).send("Internal Server Error");
        }
        if(result.length){
            res.status(400).send({msg:"User Already Exist, Please login!"})
        }
        else{
            const newPassword=await bcrypt.hash(password,10)
            db.query("INSERT INTO users SET ?",{name,email,password:newPassword,role},(err,result)=>{
                if(err){
                    res.status(400).send({err:"error creating user"})
                }else{
                    res.status(200).send({msg:"The new User has been added"})
                
                }
            })
        }
      })
    } catch (error) {
        res.status(400).send({err:"error"})
    }
})


userRouter.post('/login', async(req, res) => {
    const { email, password } = req.body;
  
   try {
    db.query('SELECT * FROM users WHERE email = ?', email, async(err, results) => {
        if (err) {
        
          res.status(500).send({ success: false, message: 'User Not found' });
        }
        console.log(results)
        if (results.length === 0) {
           res.status(401).send({ success: false, message: 'Invalid email or password.' });
        }
        
        const verify= await bcrypt.compare(password,results[0].password)
        console.log(verify)
        if(!verify){
            res.status(400).send("Incorrect Password")
           }
           else{
            const token=jwt.sign({userID:results[0].id,role:results[0].role},"ProjectHub",{expiresIn:"1d"})
            res.status(200).send({token,success: true, message: 'Login successful.' })
           }
    
      
      
      });
   } catch (error) {
    res.status(400).send({error:"error"})
   }
  });


  userRouter.get('/', authMiddleware,async(req, res) => {
    const managerID=req.body.userID;
    const role=req.body.role

    try {
        if(role!=="Team member"){
        const fetchTeamMembersQuery = 'SELECT id, name, email FROM users WHERE role = "Team member"';

    db.query(fetchTeamMembersQuery, (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.status(200).json(results);
        }
    });
    }
    
} catch (error) {
       res.status(400).send("Internal Server Error") 
    }
    
});





module.exports=userRouter