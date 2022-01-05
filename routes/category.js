const express = require("express");
const router = express.Router();
const Category = require("../models/category");




router.get("/category/clear", function (req, res, next){
    Category.find({})
    .then(function (menus) {
        menus.map((v) => {
        return Category.findByIdAndDelete({ _id: v._id }).then(function (
            menus
        ) {});
      });
      res.send("done");
    })
    .catch(next);
});


//get all categories 
router.get("/category", function (req, res, next){
  Category.find({})
  .then(function (cat){
    res.send(cat);
  })
  .catch(next);
});


//get all categories created by a vendor
router.get("/category/:vendorid", function (req, res, next){
    Category.find({vendor: req.params.vendorid})
    .then(function (cat){
      res.send(cat);
    })
    .catch(next);
});



//create category for a vendor
router.post("/category", function (req, res, next) {
  Category.create(req.body)
    .then(function (cat) {
      res.send(cat);
    })
    .catch(next);
});


// edit a particular category
router.put("/category/:id", function (req, res, next) {
    Category.findByIdAndUpdate({ _id: req.params.id }, req.body).then(function (category) {
    Category.findOne({ _id: req.params.id })
      .then(function (category) {
        res.send(category);
      })
      .catch(next);
  });
});


//delete a particular category
router.delete("/category/:id", function (req, res, next) {
    Category.findByIdAndDelete({ _id: req.params.id })
    .then(function (category) {
      res.send(category);
    })
    .catch(next);
});

module.exports = router;
