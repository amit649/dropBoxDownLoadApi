const axios=require('axios')
const fs=require('fs')
const path=require('path')
const getAccessTokenUsingRefreshToken=()=>{
    return new Promise(async(resolve,reject)=>{
        try{
            const RefreshToken=process.env.REFRESH_TOKEN;
            const resp=await fetch('https://api.dropbox.com/oauth2/token',{
                method:'POST',
                headers:{
                    "Content-Type":"application/x-www-form-urlencoded"
                },
                body:new URLSearchParams({
                    "grant_type":"refresh_token",
                    "refresh_token":RefreshToken,
                    "client_id":process.env.CLIENT_ID,
                    "client_secret":process.env.CLIENT_SECRET
                })
            })
            const data=await resp.json();
            console.log(data)
            resolve({
                accessToken:data.access_token,
                expiresIn:data.expires_in
            })
        }catch(e){
            reject(e.message)
        }    
    })
   
}

const getAllFilesFromDropBox=(accessToken)=>{
    return new Promise(async(resolve,reject)=>{
        try{
            const resp=await fetch('https://api.dropboxapi.com/2/file_requests/list_v2', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({'limit': 1000})
            })
            const data=await resp.json();
            resolve(data);
        }catch(e){
            reject(e.message);
        }
    })
}

const getFolderFromDropBox=(accessToken,path)=>{
    const data = {
        path: path,  // Empty string means the root directory
        recursive: false,
        include_media_info: false,
        include_deleted: false,
        include_has_explicit_shared_members: false
    };
    return new Promise(async(resolve,reject)=>{
        try{
            const resp=await fetch('https://api.dropboxapi.com/2/files/list_folder', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            if(resp.ok){
                const data=await resp.json();
                resolve(data);
            }
        }catch(e){
            resolve(e.message);
        }
    })
}

const downloadFolder=(accessToken,foldName,pathnm,name)=>{
    return new Promise(async(resolve,reject)=>{
        try {
            console.log(pathnm)
            const response = await axios.post('https://content.dropboxapi.com/2/files/download', null, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: pathnm }),
                    'Content-Type': 'application/octet-stream'
                },
                responseType: 'arraybuffer'
            });
    
            if (response.status !== 200) {
                throw new Error(`Error downloading file: ${response.statusText}`);
            }
    
            const buffer = Buffer.from(response.data);
            const filePathName=path.join(__dirname,'..','test',foldName,pathnm);
            fs.writeFileSync(filePathName, buffer, { flag: 'a',mode:0o777 });
            fs.chmodSync(filePathName,0o777);
            resolve({
                isError:false,
                message:"download Completed",
                name:name
            });
        } catch (e) {
            console.log("download err",e.message);
            resolve({
                isError:true,
                message:e.message
            });
        }

    })
}


const downloadEverything=async(access_token,Filepath,folderName)=>{
    return new Promise(async(resolve,reject)=>{
        console.log("recursive call")
        const ent=await getFolderFromDropBox(access_token,Filepath);
        const entries=ent["entries"];
        let downloadLogs=[];
        for(var i=0;i<entries.length;i++){
            try{
                if(entries[i][".tag"]=="folder"){
                    try{
                        const dirPath=path.join(__dirname,'..','test',folderName,entries[i]["path_lower"]);
                        fs.mkdirSync(dirPath, { recursive: true ,mode:0o777});
                        fs.chmodSync(dirPath,0o777);
                        let dnLogs=await downloadEverything(access_token,entries[i]["path_lower"],folderName);
                        downloadLogs=[...downloadLogs,...dnLogs];
                        
                    }catch(e){
                        let stringErr=entries[i]["name"]+" "+path.join(__dirname,'..','test',folderName,entries[i]["path_lower"])+" "+entries[i]["path_lower"]+" "+"--->folder path err--->"+e.message;
                        downloadLogs.push([entries[i]["name"],path.join(__dirname,'..','test',folderName,entries[i]["path_lower"]),entries[i]["path_lower"],"folder path err",e.message]);
                        fs.writeFileSync(path.join(__dirname,"..","logs.txt"),stringErr,{flag:"a"});
                    }
                }else{
                    let fileDown=await downloadFolder(access_token,folderName,entries[i]["path_lower"],entries[i]["name"]);
                    if(fileDown.isError){
                        let stringErr=entries[i]["name"]+" "+path.join(__dirname,'..','test',folderName,entries[i]["path_lower"])+" "+entries[i]["path_lower"]+" "+" ---> download error ---> "+fileDown.message;
                        downloadLogs.push([entries[i]["name"],path.join(__dirname,'..','test',folderName,entries[i]["path_lower"]),entries[i]["path_lower"],"download error",fileDown.message]);
                        fs.writeFileSync(path.join(__dirname,"..","logs.txt"),stringErr,{flag:"a"});
                    }
                    else{
                        let stringErr=entries[i]["name"]+" "+path.join(__dirname,'..','test',folderName,entries[i]["path_lower"])+" "+entries[i]["path_lower"]+" "+"downloaded successfully";
                        downloadLogs.push([entries[i]["name"],path.join(__dirname,'..','test',folderName,entries[i]["path_lower"]),entries[i]["path_lower"],"downloaded successfully"]);
                        fs.writeFileSync(path.join(__dirname,"..","logs.txt"),stringErr,{flag:"a"});
                    }
                }
            }catch(e){
                let stringErr=entries[i]["name"]+" "+path.join(__dirname,'..','test',folderName,entries[i]["path_lower"])+" "+entries[i]["path_lower"]+" "+" ---> unknown error ---> "+e.message;
                downloadLogs.push([entries[i]["name"],path.join(__dirname,'..','test',folderName,entries[i]["path_lower"]),entries[i]["path_lower"],"unknown error",e.message]);
                fs.writeFileSync(path.join(__dirname,"..","logs.txt"),stringErr,{flag:"a"});
            }   
        }
        resolve(downloadLogs);
    })
}

const getSizeOfDropBoxFile=async(access_token,Filepath)=>{
    return new Promise(async(resolve,reject)=>{

        const ent=await getFolderFromDropBox(access_token,Filepath);
        const entries=ent["entries"];
        let filesize=0;
        for(var i=0;i<entries.length;i++){
            try{
                if(entries[i][".tag"]=="folder"){
                    try{
                        let fl=await getSizeOfDropBoxFile(access_token,entries[i]["path_lower"]);
                        filesize+=fl;
                        console.log("return recursve call file size---->>>>>>",fl)
                    }catch(e){
                        
                    }
                }else{
                    filesize+=parseInt(entries[i]["size"]);
                    console.log("size of file when traversion through it -->> "+entries[i]["size"]);
                    console.log("total file Size total----->>>",filesize);
                    fs.writeFileSync(path.join(__dirname,"..","callLog.txt"),entries[i]["size"].toString()+"\n",{flag:'a'});
                }
            }catch(e){
                
            }
        }
        
        resolve(filesize);
    })
}


module.exports={getAccessTokenUsingRefreshToken,getAllFilesFromDropBox,getFolderFromDropBox,downloadFolder,downloadEverything,getSizeOfDropBoxFile}