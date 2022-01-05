const express = require("express");
const router = express.Router();
const Vendor = require("../models/vendor");
const fs = require("fs");
const AWS = require("aws-sdk");
let multer = require("multer");

const ID = "AKIATM4GCCB2BOMJGDR3";
const SECRET = "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";
const BUCKET_NAME = "fybe-product";

const s3 = new AWS.S3({
  accessKeyId: ID,
  secretAccessKey: SECRET,
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/image");
  },
  filename: (req, file, cb) => {
    let filename = Date.now() + "--" + file.originalname;
    cb(null, filename.replace(/\s+/g, ""));
  },
});

const upload = multer({
  storage: imageStorage,
});

//clear all vendor
router.get("/vendor/clear", function (req, res, next) {
  Vendor.find({})
    .then(function (venue) {
      venue.map((v) => {
        return Vendor.findByIdAndDelete({ _id: v._id }).then(function (
          venue
        ) {});
      });
      res.send("done");
    })
    .catch(next);
});

//api to get all vendors
router.get("/vendor", function (req, res, next) {
  Vendor.find({})
    .then(function (vendor) {
      res.send(vendor);
    })
    .catch(next);
});

//api to get the details of a particular vendor
router.get("/vendor/:id", function (req, res, next) {
  Vendor.findById({ _id: req.params.id })
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

// api to create a vendor
router.post("/vendor", upload.single("image"), async (req, res, next) => {
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
    Vendor.create({
      name: req.body.name,
      start: req.body.start,
      end: req.body.end,
      image: data.Location,
      deliverytime: req.body.deliverytime,
      specialty: req.body.specialty,
      deliveryfee: req.body.deliveryfee,
    })
      .then(function (vendor) {
        res.send(vendor);
      })
      .catch(next);
  });
});

// api to update the details of vendors
router.put("/vendor/:id", function (req, res, next) {
  Vendor.findByIdAndUpdate({ _id: req.params.id }, req.body).then(function (
    vendor
  ) {
    Vendor.findOne({ _id: req.params.id })
      .then(function (vendor) {
        res.send(vendor);
      })
      .catch(next);
  });
});

// api to delete a vendor
router.delete("/vendor/:id", function (req, res, next) {
  Vendor.findByIdAndDelete({ _id: req.params.id })
    .then(function (vendor) {
      res.send(vendor);
    })
    .catch(next);
});

module.exports = router;
