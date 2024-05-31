require('dotenv').config();
const express=require('express');
const app=express();
const PORT=process.env.PORT || 2002;
const AuthRouter=require('./controllers/authController')
const dropBoxRouter=require('./controllers/DropBoxApi')

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use('/auth',AuthRouter)
app.use('/dropBox',dropBoxRouter)


app.get('/',(req,res)=>{
    res.send('hi babe')
})

app.listen(PORT);