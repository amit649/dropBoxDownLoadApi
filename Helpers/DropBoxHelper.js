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

const LocalStorageFolderRootPath="./test/"
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

const downloadFolder=(accessToken,pathnm,name)=>{
    return new Promise(async(resolve,reject)=>{
        try {
            console.log(accessToken, pathnm);
            
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
            fs.writeFileSync(`${LocalStorageFolderRootPath}${pathnm}`, buffer, { flag: 'a',mode:0o777 });
            fs.chmodSync(`${LocalStorageFolderRootPath}${pathnm}`,0o777);
            resolve({
                isError:false,
                message:"download Completed",
                name:name
            });
        } catch (e) {
            console.log(e.message);
            resolve({
                isError:false,
                message:e.message
            });
        }

    })
}

const downloadEverything=async(access_token,Filepath)=>{
    return new Promise(async(resolve,reject)=>{
        const ent=await getFolderFromDropBox(access_token,Filepath);
        const entries=ent["entries"];
        for(var i=0;i<entries.length;i++){
            try{
                if(entries[i][".tag"]=="folder"){
                    try{
                        const dirPath=path.join('./test',entries[i]["path_lower"]);
                        fs.mkdirSync(dirPath, { recursive: true ,mode:0o777});
                        fs.chmodSync(dirPath,0o777);
                        await downloadEverything(access_token,entries[i]["path_lower"]);
                    }catch(e){
                        console.log(e.message)
                        fs.writeFileSync('./fileErrorLog.txt',`error while downloading the folder with name ${entries[i]["name"]} having path " ${entries[i]["path_lower"]} " , error= ${e.message} \n`,{flag:'a',mode: 0o666 })
                    }
                }else{
                    let fileDown=await downloadFolder(access_token,entries[i]["path_lower"]);
                    if(fileDown.isError){
                        fs.writeFileSync('./fileErrorLog.txt',`error while downloading the file with name ${entries[i]["name"]} having folder path " ${entries[i]["path_lower"]} " , error= ${fileDown.message} \n`,{flag:'a',mode: 0o666})
                    }
                    else{
                        try{
                            fs.writeFileSync('./downloadLog.txt',`downloaded the file with name ${entries[i]["name"]} in folder " ${entries[i]["path_lower"]} " \n`,{flag:'a',mode: 0o666})
                        }catch(e){
                            fs.writeFileSync('./fileWriteErrorLog.txt',`write error while writing the file with name ${entries[i]["name"]} having folder path " ${entries[i]["path_lower"]} " , error= ${e.message} \n`,{flag:'a',mode: 0o666})
                        }
                    }
                }
            }catch(e){
                fs.writeFileSync('./fileErrorLog.txt',`error while downloading the file or folder name ${entries[i]["name"]} residing in path " ${entries[i]["path_lower"]} " , error= ${e.message} \n`,{flag:'a',mode: 0o666})
            }
        }
        resolve("done");
    })
}


module.exports={getAccessTokenUsingRefreshToken,getAllFilesFromDropBox,getFolderFromDropBox,downloadFolder,downloadEverything}