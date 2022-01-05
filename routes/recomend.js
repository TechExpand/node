const express = require("express");
const router = express.Router();
const Recomend = require("../models/recomend");
let multer = require("multer");






//clear all trends
router.get("/recomend/clear", function (req, res, next){
    Recomend.find({})
  .then(function (venue) {
    venue.map((v) => {
      return Recomend.findByIdAndDelete({ _id: v._id }).then(function (
          venue
      ) {});
    });
    res.send("done");
  })
  .catch(next);
});





//api to get all trends
router.get("/recomend", function (req, res, next) {
    Recomend.find({})
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
router.post('/recomend',  (req, res, next) => {
    Recomend.create(req.body)
  .then(function (vendor) {
    res.send(vendor);
  })
  .catch(next);
})


// api to update the details of vendors
router.put("/recomend/:id", function (req, res, next) {
    Recomend.findByIdAndUpdate({ _id: req.params.id }, req.body).then(function (vendor) {
        Recomend.findOne({ _id: req.params.id })
      .then(function (vendor) {
        res.send(vendor);
      })
      .catch(next);
  });
});

// api to delete a vendor
router.delete("/recomend/:id", function (req, res, next) {
    Recomend.findByIdAndDelete({ _id: req.params.id })
    .then(function (vendor) {
      res.send(vendor);
    })
    .catch(next);
});

module.exports = router;
