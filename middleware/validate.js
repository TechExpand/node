var jwt = require("jsonwebtoken");
const TOKEN_SECRET = "222hwhdhnnjduru838272@@$henncndbdhsjj333n33brnfn";


module.exports = async (req, res, next)=>{
    const token = req.header('Authorization');

    if(!token){
        return res.status(400).send({message: 'No token found'})
    }
    

    try{
    let result = await jwt.verify(token, TOKEN_SECRET)
    req.user = result.id
    next()
    }catch(err){
        console.log(err)
        return res.status(400).send({message: 'Access Denied'})
    }

    
}