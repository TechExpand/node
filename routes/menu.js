const express = require("express");
const router = express.Router();
const Menu = require("../models/menu");
const Vendor = require("../models/vendor");
let multer = require("multer");
const fs = require("fs");
const AWS = require("aws-sdk");


const ID = "AKIATM4GCCB2BOMJGDR3";
const SECRET = "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";
const BUCKET_NAME = "fybe-product";

const s3 = new AWS.S3({
  accessKeyId: ID,
  secretAccessKey: SECRET,
});




const imageStorage = multer.diskStorage({    
  destination: (req, file, cb) => {
        cb(null, './public/image')
  },
  filename: (req, file, cb) => {
    let filename = Date.now() + "--" + file.originalname;
    cb(null, filename.replace(/\s+/g, ''))
}
});



const upload = multer({
  storage: imageStorage,
}) 


router.get("/menu/clear", function (req, res, next) {
    Menu.find({})
    .then(function (menus) {
        menus.map((v) => {
        return Menu.findByIdAndDelete({ _id: v._id }).then(function (
            menus
        ) {});
      });
      res.send("done");
    })
    .catch(next);
});


//get all menus
router.get("/menu", function (req, res, next) {
    Menu.find({})
    .then(function (vendor) {
      res.send(vendor);
    })
    .catch(next);
});


//get the menus that belong to a particular vendor of a single category
router.get("/vendor-menu/:vendorid/:catid", function (req, res, next) {
    Menu.find({vendor: req.params.vendorid, category: req.params.catid}).populate('category')
    .then(function (vendor) {
      res.send(vendor);
    })
    .catch(next);
});



//get the menus that belong to a particular vendor of a single category
router.get("/vendormenu/:vendorid/:catid", function (req, res, next) {
  Menu.find({vendor: req.params.vendorid, category: req.params.catid}).populate('category')
  .then(function (vendor) {
    res.send(vendor);
  })
  .catch(next);
});


//get the particular details of a menu
router.get("/menu/:id", function (req, res, next) {
    Menu.findById({ _id: req.params.id })
    .then(function (menu) {
      res.send(menu);
    })
    .catch(next);
});



/**
 * 
 * accessed by only admins of fybe app
 * 
 * 
**/

//create the menu of a vendor
// api to create a vendor
router.post('/menu', upload.single("image"), (req, res, next) => {


  // Read content from the file
  const fileContent = fs.readFileSync(req.file.path);

  // Setting up S3 upload parameters
  const params = {
    Bucket: BUCKET_NAME,
    Key: req.file.path, // File name you want to save as in S3
    Body: fileContent,
  };

  // Uploading files to the bucket
  s3.upload(params, function (err, data) {
    if (err) {
      res.status(400).send(err);
    }
    console.log(`File uploaded successfully. ${data.Location}`);
    Menu.create({
      category: req.body.category,
      vendor: req.body.vendor,
      title: req.body.title,
      image: data.Location,
      description: req.body.description,
      price: req.body.price,
      vendortitle: req.body.vendortitle,
    })
    .then(function (menu) {
      res.send(menu);
    })
    .catch(next);
  });


  
})




//edit a particular menu 
router.put("/menu/:id", function (req, res, next) {
    Menu.findByIdAndUpdate({ _id: req.params.id }, req.body).then(function (menu) {
        Menu.findOne({ _id: req.params.id })
      .then(function (menu) {
        res.send(menu);
      })
      .catch(next);
  });
});


//delete a particular menu
router.delete("/menu/:id", function (req, res, next) {
    Menu.findByIdAndDelete({ _id: req.params.id })
    .then(function (menu) {
      res.send(menu);
    })
    .catch(next);
});







//search to get all vendors and menus
router.get("/search", function (req, res, next){
  Vendor.find({name:{$regex : req.query.search}})
  .then(function (vendor) {
    // res.send(vendor);
    Menu.find({title: {$regex :req.query.search}})
  .then(function (menu) {
  let filterVendor =   vendor.map(function(v){
    return {...v._doc, status: "vendor"}
  })

  let filterMenu =   menu.map(function(m){
    return {...m._doc, status: "menu"}
  })

  let combineFilter = [...filterVendor, ...filterMenu]
    res.send(combineFilter);
  })
  .catch(next);
  })
  .catch(next);
});


module.exports = router;
