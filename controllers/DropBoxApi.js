const { getAccessTokenUsingRefreshToken, getAllFilesFromDropBox ,getFolderFromDropBox,downloadFolder,downloadEverything} = require('../Helpers/DropBoxHelper');
const {v4:uuidv4}=require('uuid')
const Router=require('express').Router();
const fs=require('fs')
const pth=require('path')
const xlsx=require('xlsx')

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
        const dt=new Date();
        let folderName=`${dt.getDate()}_${dt.getMonth()}_${dt.getFullYear()}__${dt.getHours()}_${dt.getMinutes()}_${dt.getSeconds()}__${uuidv4()}`;
        const baseDir = pth.join(__dirname,'..', 'test');
        const logsBaseDir=pth.join(__dirname,'..','logs');
        let logFileName=folderName+".xlsx";
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        if (!fs.existsSync(logsBaseDir)) {
            fs.mkdirSync(logsBaseDir, { recursive: true });
        }

        const folderPath = pth.join(baseDir, folderName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const downloadLogs=await downloadEverything(access_token,downPath,folderName);
        const excelWorkBookPath=pth.join(logsBaseDir,logFileName);
        let xlWorkbookData=[["File Name","File Local Path","File Drop Box Path","status","error message"],...downloadLogs]

        const workbook=xlsx.utils.book_new();

        const sheetName="download logs sheet";
        const worksheet=xlsx.utils.aoa_to_sheet(xlWorkbookData)

        xlsx.utils.book_append_sheet(workbook,worksheet,sheetName);

        xlsx.writeFile(workbook,excelWorkBookPath);
        
        res.json({
            isError:false,
            message:'download done check logs for the same'
        })
    }catch(e){
        res.json({
            isError:true,
            message:e.message
        })
    }
})


module.exports=Router;