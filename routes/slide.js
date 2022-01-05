const express = require("express");
const router = express.Router();
const Slide = require("../models/slide");
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


router.get("/slide/clear", function (req, res, next) {
    Slide.find({})
    .then(function (menus) {
        menus.map((v) => {
        return Slide.findByIdAndDelete({ _id: v._id }).then(function (
            menus
        ) {});
      });
      res.send("done");
    })
    .catch(next);
});


//get all menus
router.get("/slide", function (req, res, next) {
    Slide.find({})
    .then(function (vendor) {
      res.send(vendor);
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
router.post('/slide', upload.single("image"), (req, res, next) => {
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
      Slide.create({
    image: data.Location,
  })
  .then(function (menu) {
    res.send(menu);
  })
  .catch(next);
  });
 
})




//edit a particular menu 
router.put("/slide/:id", function (req, res, next) {
    Slide.findByIdAndUpdate({ _id: req.params.id }, req.body).then(function (menu) {
        Slide.findOne({ _id: req.params.id })
      .then(function (menu) {
        res.send(menu);
      })
      .catch(next);
  });
});


//delete a particular menu
router.delete("/slide/:id", function (req, res, next) {
    Slide.findByIdAndDelete({ _id: req.params.id })
    .then(function (menu) {
      res.send(menu);
    })
    .catch(next);
});

module.exports = router;
