const { getAccessTokenUsingRefreshToken, getAllFilesFromDropBox ,getFolderFromDropBox,downloadFolder,downloadEverything} = require('../Helpers/DropBoxHelper');

const Router=require('express').Router();


Router.get('/fileList',async(req,res)=>{

    try{
        const token=await getAccessTokenUsingRefreshToken();
        const access_token=token.accessToken
        const files=await getFolderFromDropBox(access_token,"");
        res.json(files);
        
    }catch(e){
        res.json(e.message)
    }
    
})


Router.get('/fileDownload',async(req,res)=>{
    try{
        const {path,accessToken}=req.query;
        let downPath="";
        if(path){
            downPath=path;
        }
        let access_token="";
        if(accessToken){
            console.log(accessToken)
            access_token=accessToken;
        }  
        else{
            access_token=await getAccessTokenUsingRefreshToken();
            access_token=access_token.accessToken;
        }
        
        await downloadEverything(access_token,downPath);
        res.json({
            isError:false,
            message:'download done check logs for the same'
        })
    }catch(e){
        res.json({
            isError:true,
            message:'download failed check console'
        })
    }
})


module.exports=Router;