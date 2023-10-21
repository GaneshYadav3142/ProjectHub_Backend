const jwt=require("jsonwebtoken")

const authMiddleware=async (req,res,next)=>{
const token=req.headers.authorization?.split(" ")[1]

if(token){
    try {
        const decode=jwt.verify(token,"ProjectHub");
        if(decode){
            req.body.userID=decode.userID;
            req.body.role=decode.role
            console.log( req.body.role)
            next()
        }
        else{
            res.status(401).json({ error: "Unauthorized" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}
else{
    res.status(400).json({msg:"Please Login"})
}
}

module.exports=authMiddleware