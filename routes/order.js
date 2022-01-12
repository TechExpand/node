const express = require("express");
const router = express.Router();
// const Order = require("../models/order");
const axios = require("axios");
const { google } = require("googleapis");
const SECRET_KEY = "sk_test_71f3b9d8264d80b730cf960c3eff7d434fdb168e";
const Order = require("../models/order");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const userOrder = require("../models/UserOrder");
const Cart = require("../models/cart");
const { populate } = require("../models/cart");
const checkAuth = require("../middleware/validate")

//api to get all order of a user
// router.get("/order/:userid", function (req, res, next) {
//   Order.find({ user: req.params.userid })
//     .then(function (vendor) {
//       res.send(vendor);
//     })
//     .catch(next);
// });

/**
 *
 * accessed by only admins of fybe app
 *
 *
 **/


// Pull out OAuth2 from googleapis
const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
// 1
  const oauth2Client = new OAuth2(
    "954681232618-04nc2kq8qtku7ciqkj8gemg7fk858u5o.apps.googleusercontent.com",
    "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",
    "https://developers.google.com/oauthplayground"
  );
  
// 2
  oauth2Client.setCredentials({
    refresh_token: "1//04mWZfB5m6hJhCgYIARAAGAQSNwF-L9IrNsMYtGUWmbYLrej8tzhKK9_cC3ZYEf4Ga33dTHACZ8MilXQwZ68emmxvH9Yk3js9mM0",
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject("Failed to create access token :( " + err);
      }
      resolve(token);
    });
  });

// 3
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: "fybelogistics@gmail.com",
      accessToken,
      clientId:
      "954681232618-04nc2kq8qtku7ciqkj8gemg7fk858u5o.apps.googleusercontent.com",
      clientSecret: "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",
      refreshToken:
      "1//04mWZfB5m6hJhCgYIARAAGAQSNwF-L9IrNsMYtGUWmbYLrej8tzhKK9_cC3ZYEf4Ga33dTHACZ8MilXQwZ68emmxvH9Yk3js9mM0",
    },
  });

// 4
  return transporter;
};







//clear all order
router.get("/order/clear", function (req, res, next){
  userOrder.find({})
  .then(function (venue) {
    venue.map((v) => {
      return userOrder.findByIdAndDelete({ _id: v._id }).then(function (
          venue
      ) {});
    });
    res.send("done");
  })
  .catch(next);
});



router.get('/order', checkAuth, function(req,res,next){
  userOrder.find({user: req.user}).populate('menu').then(function (cart){
      res.send(cart);
  })
})


router.post("/order/:reference", (req, res, next) => {
  axios
    .get(`https://api.paystack.co/transaction/verify/${req.params.reference}`, {
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
      },
    })
    .then((response) => {
      
      if (response.data.data.status === "success") {
        Order.create(req.body)
          .then(function (order) {
            User.find({_id: req.body.user})
            .then(function (user) {
                Cart.find({user: req.body.user}).populate({ 
                    path: 'menu',
                    populate: {
                      path: 'category',
                    } ,
                 }).populate({ 
                    path: 'menu',
                    populate: {
                      path: 'vendor',
                    } ,
                 })
                .then(async function (cart) {
                 const newValue = [];

                     const  menuItem = () => {
                        let  index = 0;
                        for(let value of cart){
                          userOrder.create(
                            {
                              menu: value.menu,
                              user: req.body.user,
                            }
                          )
                            index++
                            let template =  `
                        Menu ${index}. 
                        CATEGORY: ${value.menu.category.title},
                        VENDOR: ${value.menu.vendor.name},
                        MENU TITLE: ${value.menu.title},
                        MENU DESCRIPTION: ${value.menu.description},
                                   `;
                                   newValue.push(template)
                        }
                    }

                    menuItem()

                    let mailOptions = {
                        from: user[0].email,
                        to: "fybelogistics@gmail.com",
                        subject: "FYBE ORDER CREATED",
                        text:
                        `
                        Order:
                        ${newValue.join("")}
                        ORDER DESCRIPTION: ${req.body.description},
                        USER EMAIL: ${user[0].email},
                        DELIVERY LOCATION: ${req.body.deliverylocation},
                        NEAREST BUS-STOP: ${req.body.nearestbusstop},
                        `,
                      };

                      let emailTransporter = await createTransporter();

                    emailTransporter.sendMail(mailOptions, function (err, data) {
                      if (err) {
                        res.send(err);
                      } else {

                       

                        Cart.find({user: req.body.user})
                        .then(function (venue) {

                          venue.map((v) => {
                            return Cart.findByIdAndDelete({ _id: v._id }).then(function (
                                venue
                            ) {});
                          });
                          res.send({message: 'sucessfully ordered', status:true});
                        })
                      }
                    });
                })
            })

            
          })
          .catch(next);
      } else {
        res.send(response.data);
      }
    })
    .catch((error) => {
      res.send(error.response.data);
    });
});

module.exports = router;
