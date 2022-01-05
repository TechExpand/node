const express = require('express');
const cors = require('cors');
const app = express();
const AWS = require('aws-sdk');
// let multer = require('multer');
// let upload = multer();
let cookieParser = require('cookie-parser');


const mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost/ourdata');
// mongoose.Promise = global.Promise;


// const { MongoClient } = require('mongodb');
 const uri = "mongodb+srv://ediku126:Ediku126@cluster0.afufm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// client.connect(err => {
//   const collection = client.db("ourdata").collection("fybe");
//   client.close();
// });



mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("MongoDB Connected…")
})
.catch(err => console.log(err))



app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(express.urlencoded({extended: true}));
// app.use(upload.array()); 
// app.use(express.static('public'));
app.use(express.static('public/image'));
app.use('/api',require('./routes/api'));
app.use('/api',require('./routes/vendors'));
app.use('/api',require('./routes/category'));
app.use('/api',require('./routes/order'));
app.use('/api',require('./routes/menu'));
app.use('/api',require('./routes/trends'));
app.use('/api',require('./routes/recomend'));
app.use('/api',require('./routes/slide'));
app.use(function(err,req,res,next){
  res.status(422).send({error: err.message});
});














app.get('*', function(req, res){
  res.send('Sorry, this is an invalid URL.');
});



// app.listen("192.168.43.225" || 3000);
// console.log('Web Server is listening at port '+ ("192.168.43.225" || 3000));
app.listen(process.env.port || 3000);
console.log('Web Server is listening at port '+ (process.env.port || 3000));