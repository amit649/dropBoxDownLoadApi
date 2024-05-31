const { getAccessTokenUsingRefreshToken } = require('../Helpers/DropBoxHelper');

const Router=require('express').Router();

Router.get('/accessToken',async(req,res)=>{
    const accessToken=await getAccessTokenUsingRefreshToken();
    res.send(accessToken)
})


module.exports=Router;