const express = require("express");
const router = express.Router();
const Trend = require("../models/trending");
let multer = require("multer");






//clear all trends
router.get("/trend/clear", function (req, res, next){
    Trend.find({})
  .then(function (venue) {
    venue.map((v) => {
      return Trend.findByIdAndDelete({ _id: v._id }).then(function (
          venue
      ) {});
    });
    res.send("done");
  })
  .catch(next);
});





//api to get all trends
router.get("/trend", function (req, res, next) {
    Trend.find({})
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



// api to create a trend
router.post('/trend',  (req, res, next) => {
    Trend.create(req.body)
  .then(function (vendor) {
    res.send(vendor);
  })
  .catch(next);
})


// api to update the details of vendors
router.put("/trend/:id", function (req, res, next) {
    Trend.findByIdAndUpdate({ _id: req.params.id }, req.body).then(function (vendor) {
        Trend.findOne({ _id: req.params.id })
      .then(function (vendor) {
        res.send(vendor);
      })
      .catch(next);
  });
});

// api to delete a vendor
router.delete("/trend/:id", function (req, res, next) {
    Trend.findByIdAndDelete({ _id: req.params.id })
    .then(function (vendor) {
      res.send(vendor);
    })
    .catch(next);
});

module.exports = router;
