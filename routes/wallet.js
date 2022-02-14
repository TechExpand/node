const express = require("express");
const router = express.Router();
const Coupon = require("../models/coupon");
const axios = require("axios");
const Wallet = require("../models/wallet");
const User = require("../models/user");
let multer = require("multer");
const SECRET_KEY = "sk_test_27289215573221e30c39260423bfd64c6b8b7f1b";






//clear all wallet
router.get("/wallet/clear", function (req, res, next){
    Wallet.find({})
  .then(function (wallets) {
    wallets.map((v) => {
      return Wallet.findByIdAndDelete({ _id: v._id }).then(function (
          venue
      ) {});
    });
    res.send("done");
  })
  .catch(next);
});





//api to get all   wallets
router.get("/wallet", function (req, res, next) {
    Wallet.find({})
    .then(function (wallets) {
      res.send(wallets);
    })
    .catch(next);
});


//get the particular details of a wallet
router.get("/wallet/:id", function (req, res, next) {
    Wallet.findOne({ user: req.params.id })
    .then(function (wallets) {
      res.send(wallets);
    })
    .catch(next);
});






/**
 * 
 * accessed by only admins of fybe app
 * 
 * 
**/



// api to create a wallets
router.post('/wallet',  (req, res, next) => {
    Wallet.create(req.body)
  .then(function (wallets) {
    res.send(wallets);
  })
  .catch(next);
})


// api to update the details of wallets
router.put("/wallets/:id", function (req, res, next) {
    Wallet.findByIdAndUpdate({ _id: req.params.id }, req.body).then(function (wallets) {
        Wallet.findOne({ _id: req.params.id })
      .then(function (wallets) {
        res.send(wallets);
      })
      .catch(next);
  });
});

// api to delete a wallets
router.delete("/wallet/:id", function (req, res, next) {
    Wallet.findByIdAndDelete({ _id: req.params.id })
    .then(function (wallets) {
      res.send(wallets);
    })
    .catch(next);
});


router.post("/fundwallet/:reference", (req, res, next) => {
    axios
      .get(`https://api.paystack.co/transaction/verify/${req.params.reference}`, {
        headers: {
          Authorization: `Bearer ${SECRET_KEY}`,
        },
      })
      .then((response) => {
        if (response.data.data.status === "success") {
            Wallet.findOneAndUpdate({ user: req.body.user }, {
                user: req.body.user,
                email: req.body.email,
                amount:req.body.amount,
            }, {
  new: true
}).then(function (wallets) {
                res.send(wallets);
          });
        } else {
          res.send(response.data);
        }
      })
      .catch((error) => {
        res.send(error.response.data);
      });
  });







//clear all coupon
router.get("/coupon/clear", function (req, res, next){
    Coupon.find({})
  .then(function (coupons) {
    coupons.map((v) => {
      return Coupon.findByIdAndDelete({ _id: v._id }).then(function (
          venue
      ) {});
    });
    res.send("done");
  })
  .catch(next);
});





//api to get all Coupon
router.get("/coupon", function (req, res, next) {
    Coupon.find({})
    .then(function (coupons) {
      res.send(coupons);
    })
    .catch(next);
});


//get the particular details of a Coupon
router.get("/coupon/:id", function (req, res, next) {
    Coupon.findById({ _id: req.params.id })
    .then(function (coupons) {
      res.send(coupons);
    })
    .catch(next);
});






/**
 * 
 * accessed by only admins of fybe app
 * 
 * 
**/



// api to create a Coupon
router.post('/coupon',  (req, res, next) => {
    Coupon.create(req.body)
  .then(function (coupons) {
    res.send(coupons);
  })
  .catch(next);
})


// api to update the details of Coupon
router.put("/coupon/:id", function (req, res, next) {
    Coupon.findByIdAndUpdate({ _id: req.params.id }, req.body).then(function (coupons) {
        Coupon.findOne({ _id: req.params.id })
      .then(function (coupons) {
        res.send(coupons);
      })
      .catch(next);
  });
});

// api to delete a Coupon
router.delete("/coupon/:id", function (req, res, next) {
    Coupon.findByIdAndDelete({ _id: req.params.id })
    .then(function (coupons) {
      res.send(coupons);
    })
    .catch(next);
});
module.exports = router;
