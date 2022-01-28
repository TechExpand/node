const express = require("express");
const router = express.Router();
const Cart = require("../models/cart");
const User = require("../models/user");
const Profile = require("../models/profile");
const bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
const axios = require("axios");
const saltRounds = 10;
const checkAuth = require("../middleware/validate");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { json } = require("body-parser");
const TOKEN_SECRET = "222hwhdhnnjduru838272@@$henncndbdhsjj333n33brnfn";

const validateEmail = (email) => {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
};

router.post("/login", function (req, res, next) {
  let { email, password } = req.body;
  if (email === "" || password === "" || !email || !password) {
    res.status(400).send({ message: "field cannot be empty" });
  }
  if (!validateEmail(email)) {
    res.status(400).send({ message: "enter a valid email" });
  }
  User.findOne({ email: email })
    .then(function (user) {
      if (!user) {
        res.status(400).send({ message: "invalid credentials" });
      }
      bcrypt.compare(password, user.password).then(function (result) {
        if (!result) {
          res.status(400).send({ message: "invalid credentials" });
        }
        Profile.find({ user: user._id }).then(function (profile) {
          let token = jwt.sign({ id: user._id }, TOKEN_SECRET, {
            expiresIn: "3600000000s",
          });
          res.send({
            id: user._id,
            token: token,
            email: user.email,
            fullname: profile[0].name,
            deliveryfee: profile[0].deliveryfee,
          });
        });
      });
    })
    .catch(next);
});

router.post("/signup", function (req, res, next) {
  let { email, password, fullname } = req.body;
  if (email === "" || password === "" || !email || !password) {
    res.status(400).send({ message: "field cannot be empty" });
  }
  if (password.length <= 6) {
    res
      .status(400)
      .send({ message: "password must be greater than 6 characters" });
  }
  if (!validateEmail(email)) {
    res.status(400).send({ message: "enter a valid email" });
  }
  User.findOne({ email: email })
    .then(function (user) {
      if (user) {
        res.status(400).send({ message: "user already exist" });
      } else {
        bcrypt.hash(password, saltRounds, function (err, hashedPassword) {
          User.create({
            email: email,
            password: hashedPassword,
          })
            .then(function (createduser) {
              Profile.create({
                email: email,
                name: fullname,
                user: createduser._id,
                deliveryfee: 0,
              })
                .then(function (profile) {
                  let token = jwt.sign({ id: createduser._id }, TOKEN_SECRET, {
                    expiresIn: "3600000000s",
                  });
                  res.send({
                    id: createduser._doc._id,
                    token: token,
                    fullname: fullname,
                    email: createduser._doc.email,
                    deliveryfee: 0,
                  });
                })
                .catch(next);
            })
            .catch(next);
        });
      }
    })
    .catch(next);
});

//get get delivery amount
router.get("/getamount", function (req, res, next) {
  res.send({ message: 300 });
});

//get all users
router.get("/users", checkAuth, function (req, res, next) {
  User.find({}).then(function (users) {
    res.send(users);
  });
});

//get profile of a particular user
router.post("/profile", checkAuth, function (req, res, next) {
  Profile.findOne ({ user: req.body.user }).then(function (profile) {
    res.send(profile);
  });
});

//edit a particular profile
router.put("/profile", checkAuth, function (req, res, next) {
  Profile.updateOne(
    { user: req.user },
    { name: req.body.name },
    function (err, docs) {
      if (err) {
        res.status(400).send({ message: "failed to update" });
      } else {
        Profile.findOne({ user: req.user }).then(function (data) {
          res.send(data);
        });
      }
    }
  );
});

router.get("/cart/clear", function (req, res, next) {
  Cart.find({})
    .then(function (menus) {
      menus.map((v) => {
        return Cart.findByIdAndDelete({ _id: v._id }).then(function (menus) {});
      });
      res.send("done");
    })
    .catch(next);
});

// get cart of the currently logged in user
router.get("/cart/", checkAuth, function (req, res, next) {
  Cart.find({ user: req.user })
    .populate({
      path: "menu",
      populate: {
        path: "vendor",
      },
    })
    .populate("user")
    .then(function (cart) {
      res.send(cart);
    });
});





// get cart of the currently logged in user
router.get("/cartv2/", checkAuth, function (req, res, next) {
  Cart.find({ user: req.user })
    .populate({
      path: "menu",
      populate: {
        path: "vendor",
      },
    })
    .populate("user")
    .then(function (cart){
      newCart = []
      newCartID = []
      cart.map((e) => {
        if(newCartID.includes(e.menu._id)){
          objIndex = newCart.findIndex((obj => obj.menu.id == e.menu._id));
          newCart[objIndex].quantity = String(Number(newCart[objIndex].quantity) + Number("1"))
        }else{
          newCartID.push(e.menu._id)
          newCart.push(e);
        }
      });
      res.send(newCart);
    });
});



//verify user cart for multiple vendor order
router.post("/vendor-verify", function (req, res, next) {
  Cart.find({ user: req.body.user })
    .populate("menu")
    .then(function (value) {
      if (value.length == 0) {
        res.send({ message: false });
      } else {
        let newCartList = [];
        value.map((e) => {
          newCartList.push(JSON.stringify(e.menu.vendor));
        });
        combinedNewCartList = [...newCartList, JSON.stringify(req.body.vendor)] 
        let vendorCount = [...new Set(combinedNewCartList)];
        if (vendorCount.length == 1) {
          res.send({ message: false });
        } else {
          res.send({ message: true });
        }
      }
    });
});

//create cart for a user
router.post("/cart", function (req, res, next) {
  Cart.find({ user: req.body.user })
    .populate("menu")
    .then(function (value) {
      if (value.length === 0) {
        Profile.findOne({ user: req.body.user }).then(function (profile) {
          Profile.findByIdAndUpdate(
            { _id: profile._id },
            { 
              _id: profile._id,
              user: profile.user,
              name: profile.name,
              email: profile.email,
              __v: profile.__v,
              deliveryfee: 0 ,
             }
          ).then(function (props) {
            Cart.create(req.body)
              .then(function (cart) {
                res.send({ deliveryfee: 0, value: "1" });
              })
              .catch(next);
          });
        });
      } else {
        let newCartList = [];
        value.map((e) => {
          newCartList.push(JSON.stringify(e.menu.vendor));
        });
        combinedNewCartList = [...newCartList, JSON.stringify(req.body.vendor)] 
        let vendorCount = [...new Set(combinedNewCartList)];
        if (vendorCount.length === 1) {
          Profile.findOne({ user: req.body.user }).then(function (profile) {
            Profile.findByIdAndUpdate(
              { _id: profile._id },
              { 
                _id: profile._id,
                user: profile.user,
                name: profile.name,
                email: profile.email,
                __v: profile.__v,
                deliveryfee: 0 }
            ).then(function (props) {
              Cart.create(req.body)
                .then(function (cart) {
                  res.send({ deliveryfee: 0 , value: "2" });
                })
                .catch(next);
            });
          });
        } else {
          Profile.findOne({ user: req.body.user }).then(function (profile) {
            let coreectVendorCount = vendorCount.length - 1;
            Profile.findByIdAndUpdate(
              { _id: profile._id },
              { 
                _id: profile._id,
                user: profile.user,
                name: profile.name,
                email: profile.email,
                __v: profile.__v,
                deliveryfee: coreectVendorCount * 300 }
            ).then(function (props) {
              Cart.create(req.body)
                .then(function (cart) {
                  let newdelivery = coreectVendorCount * 300;
                  res.send({ deliveryfee: newdelivery, value: "3"  });
                })
                .catch(next);
            });
          });
        }
      }
    });
});

//delete user cart
router.delete("/cart/:id/:user", function (req, res, next) {
  Cart.findByIdAndDelete({ _id: req.params.id })
    .then(function (student) {
        Cart.find({user: req.params.user}).populate('menu').then(function(carts){
          if(carts.length == 0){
            Profile.findOneAndUpdate({user: req.params.user},
              {deliveryfee: 0 },
                {new: true}, (err, doc) => {
              if (err) {
                  console.log("Something wrong when updating data!");
              }
             res.send(doc)
          });
          }else{
            let newCartList = [];
            carts.map((e) => {
          newCartList.push(JSON.stringify(e.menu.vendor));
        });
        combinedNewCartList = [...newCartList] 
        let vendorCount = [...new Set(combinedNewCartList)];
        if (vendorCount.length == 1) {
          Profile.findOneAndUpdate({user: req.params.user},
            {deliveryfee: 0 },
              {new: true}, (err, doc) => {
            if (err) {
                console.log("Something wrong when updating data!");
            }
           res.send(doc)
        });
        }else{
          let coreectVendorCount = vendorCount.length - 1;
          Profile.findOneAndUpdate({user: req.params.user},
            {deliveryfee: coreectVendorCount * 300},
              {new: true}, (err, doc) => {
            if (err) {
                console.log("Something wrong when updating data!");
            }
           res.send(doc)
        });
        }
          }
        
        })
    })
    .catch(next);
});





//delete user cart
router.delete("/cartv2/:menu/:user", function (req, res, next) {
   Cart.find({'menu': req.params.menu}).then( function(result){
    //  let test;
    // result.map((e) => {

    //           Cart.findByIdAndDelete({_id: e._id})
    //           test = e._id;
    //         });

            const cartClear = async (menu, user) =>
            Cart.deleteMany({
              menu: menu,
              user: user,
            });

            cartClear(req.params.menu, req.params.user)

            res.send(test);


            // Cart.find({user: req.params.user}).populate('menu').then(function(carts){
            //   if(carts.length == 0){
            //     Profile.findOneAndUpdate({user: req.params.user},
            //       {deliveryfee: 0 },
            //         {new: true}, (err, doc) => {
            //       if (err) {
            //           console.log("Something wrong when updating data!");
            //       }
            //      res.send(doc)
            //   });
            //   }else{
            //     let newCartList = [];
            //     carts.map((e) => {
            //   newCartList.push(JSON.stringify(e.menu.vendor));
            // });
            // combinedNewCartList = [...newCartList] 
            // let vendorCount = [...new Set(combinedNewCartList)];
            // if (vendorCount.length == 1) {
            //   Profile.findOneAndUpdate({user: req.params.user},
            //     {deliveryfee: 0 },
            //       {new: true}, (err, doc) => {
            //     if (err) {
            //         console.log("Something wrong when updating data!");
            //     }
            //    res.send(doc)
            // });
            // }else{
            //   let coreectVendorCount = vendorCount.length - 1;
            //   Profile.findOneAndUpdate({user: req.params.user},
            //     {deliveryfee: coreectVendorCount * 300},
            //       {new: true}, (err, doc) => {
            //     if (err) {
            //         console.log("Something wrong when updating data!");
            //     }
            //    res.send(doc)
            // });
            // }
            //   }
            
            // })
   })
   

  // Cart.findByIdAndDelete({ _id: req.params.id })
  //   .then(function (student) {
  //       Cart.find({user: req.params.user}).populate('menu').then(function(carts){
  //         if(carts.length == 0){
  //           Profile.findOneAndUpdate({user: req.params.user},
  //             {deliveryfee: 0 },
  //               {new: true}, (err, doc) => {
  //             if (err) {
  //                 console.log("Something wrong when updating data!");
  //             }
  //            res.send(doc)
  //         });
  //         }else{
  //           let newCartList = [];
  //           carts.map((e) => {
  //         newCartList.push(JSON.stringify(e.menu.vendor));
  //       });
  //       combinedNewCartList = [...newCartList] 
  //       let vendorCount = [...new Set(combinedNewCartList)];
  //       if (vendorCount.length == 1) {
  //         Profile.findOneAndUpdate({user: req.params.user},
  //           {deliveryfee: 0 },
  //             {new: true}, (err, doc) => {
  //           if (err) {
  //               console.log("Something wrong when updating data!");
  //           }
  //          res.send(doc)
  //       });
  //       }else{
  //         let coreectVendorCount = vendorCount.length - 1;
  //         Profile.findOneAndUpdate({user: req.params.user},
  //           {deliveryfee: coreectVendorCount * 300},
  //             {new: true}, (err, doc) => {
  //           if (err) {
  //               console.log("Something wrong when updating data!");
  //           }
  //          res.send(doc)
  //       });
  //       }
  //         }
        
  //       })
  //   })
  //   .catch(next);
});






//create profile of a user
router.post("/profile", function (req, res, next) {
  Profile.create(req.body)
    .then(function (vendor) {
      res.send(vendor);
    })
    .catch(next);
});

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
    refresh_token:
      "1//04NcYxTmlH4KBCgYIARAAGAQSNwF-L9Ir7fhvyYZ1oynfN0jREHJyL2DXcF6yPgSgIcGjWHP6bF2HNfWXScOSfEmci8y_MMjSX38",
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
        "1//04NcYxTmlH4KBCgYIARAAGAQSNwF-L9Ir7fhvyYZ1oynfN0jREHJyL2DXcF6yPgSgIcGjWHP6bF2HNfWXScOSfEmci8y_MMjSX38",
    },
  });

  // 4
  return transporter;
};

function getRandomString(length) {
  var randomChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var result = "";
  for (var i = 0; i < length; i++) {
    result += randomChars.charAt(
      Math.floor(Math.random() * randomChars.length)
    );
  }
  return result;
}

router.post("/reset", async (req, res, next) => {
  if (!validateEmail(req.query.email)) {
    res.status(400).send({ message: "enter a valid email" });
  }
  User.findOne({ email: req.query.email })
    .then(function (user) {
      if (!user) {
        res.status(400).send({ message: "user does not exist" });
      }

      let newPassword = getRandomString(8);

      bcrypt.hash(newPassword, saltRounds, function (err, hashedPassword) {
        User.updateOne({ email: req.query.email }, { password: hashedPassword })
          .then(function (update) {
            User.findOne({ email: req.query.email }).then(function (info) {
              Profile.findOne({ user: info._id }).then(async function (
                userinfo
              ) {
                let mailOptions = {
                  from: "fybelogistics@gmail.com",
                  to: req.query.email,
                  subject: "FYBE RESET PASSWORD",
                  html: `
                  <!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                <head>
                <!--[if gte mso 9]>
                <xml>
                  <o:OfficeDocumentSettings>
                    <o:AllowPNG/>
                    <o:PixelsPerInch>96</o:PixelsPerInch>
                  </o:OfficeDocumentSettings>
                </xml>
                <![endif]-->
                  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <meta name="x-apple-disable-message-reformatting">
                  <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
                  <title></title>
                  
                    <style type="text/css">
                      table, td { color: #000000; } a { color: #0000ee; text-decoration: underline; } @media (max-width: 480px) { #u_content_text_3 .v-text-align { text-align: center !important; } #u_content_text_4 .v-text-align { text-align: center !important; } #u_content_button_1 .v-text-align { text-align: center !important; } #u_content_text_5 .v-text-align { text-align: center !important; } #u_content_text_6 .v-text-align { text-align: center !important; } #u_content_button_2 .v-text-align { text-align: center !important; } #u_content_text_7 .v-text-align { text-align: center !important; } #u_content_text_12 .v-text-align { text-align: center !important; } #u_content_button_3 .v-text-align { text-align: center !important; } #u_content_text_8 .v-text-align { text-align: center !important; } #u_content_text_14 .v-text-align { text-align: center !important; } }
                @media only screen and (min-width: 620px) {
                  .u-row {
                    width: 600px !important;
                  }
                  .u-row .u-col {
                    vertical-align: top;
                  }
                
                  .u-row .u-col-50 {
                    width: 300px !important;
                  }
                
                  .u-row .u-col-100 {
                    width: 600px !important;
                  }
                
                }
                
                @media (max-width: 620px) {
                  .u-row-container {
                    max-width: 100% !important;
                    padding-left: 0px !important;
                    padding-right: 0px !important;
                  }
                  .u-row .u-col {
                    min-width: 320px !important;
                    max-width: 100% !important;
                    display: block !important;
                  }
                  .u-row {
                    width: calc(100% - 40px) !important;
                  }
                  .u-col {
                    width: 100% !important;
                  }
                  .u-col > div {
                    margin: 0 auto;
                  }
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                
                table,
                tr,
                td {
                  vertical-align: top;
                  border-collapse: collapse;
                }
                
                p {
                  margin: 0;
                }
                
                .ie-container table,
                .mso-container table {
                  table-layout: fixed;
                }
                
                * {
                  line-height: inherit;
                }
                
                a[x-apple-data-detectors='true'] {
                  color: inherit !important;
                  text-decoration: none !important;
                }
                
                @media (max-width: 480px) {
                  .hide-mobile {
                    max-height: 0px;
                    overflow: hidden;
                    display: none !important;
                  }
                
                }
                    </style>
                  
                  
                
                <!--[if !mso]><!--><link href="https://fonts.googleapis.com/css?family=Lato:400,700&display=swap" rel="stylesheet" type="text/css"><!--<![endif]-->
                
                </head>
                
                <body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #ffffff;color: #000000">
                  <!--[if IE]><div class="ie-container"><![endif]-->
                  <!--[if mso]><div class="mso-container"><![endif]-->
                  <table style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #ffffff;width:100%" cellpadding="0" cellspacing="0">
                  <tbody>
                  <tr style="vertical-align: top">
                    <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                    <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: #ffffff;"><![endif]-->
                    
                
                <div class="u-row-container" style="padding: 0px;background-color: transparent">
                  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
                    <div style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
                      <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
                      
                <!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
                <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
                  <div style="width: 100% !important;">
                  <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
                  
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:15px 10px;font-family:'Lato',sans-serif;" align="left">
                        
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td class="v-text-align" style="padding-right: 0px;padding-left: 0px;" align="center">
                      <!-- logoooooo -->
                      <img align="center" border="0" src="https://web.facebook.com/Fybelogistics/photos/a.103147465602865/103323112251967/" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 38%;max-width: 220.4px;" width="220.4"/>
                      
                    </td>
                  </tr>
                </table>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                  <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
                  </div>
                </div>
                <!--[if (mso)|(IE)]></td><![endif]-->
                      <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                    </div>
                  </div>
                </div>
                
                
                
                <div class="u-row-container" style="padding: 0px;background-color: transparent">
                  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #37a565;">
                    <div style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
                      <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: #f1c40f;"><![endif]-->
                      
                <!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
                <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
                  <div style="width: 100% !important;">
                  <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
                  
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:3px 0px;font-family:'Lato',sans-serif;" align="left">
                        
                  <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 0px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                    <tbody>
                      <tr style="vertical-align: top">
                        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                          <span>&#160;</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                  <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
                  </div>
                </div>
                <!--[if (mso)|(IE)]></td><![endif]-->
                      <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                    </div>
                  </div>
                </div>
                
                
                
                <div class="u-row-container" style="padding: 0px;background-color: transparent">
                  <!-- logoooooo -->
                  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #6d6d6d;">
                    <div style="border-collapse: collapse;display: table;width: 100%;">
                      <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-image: url('images/image-9.png');background-repeat: no-repeat;background-position: center top;background-color: #90b0ca;"><![endif]-->
                      
                <!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
                <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
                  <div style="width: 100% !important;">
                  <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
                  
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:7px;font-family:'Lato',sans-serif;" align="left">
                        
                  <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 0px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                    <tbody>
                      <tr style="vertical-align: top">
                        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                          <span>&#160;</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:'Lato',sans-serif;" align="left">
                        
                  <div class="v-text-align" style="line-height: 140%; text-align: center; word-wrap: break-word;">
                    <p style="font-size: 14px; line-height: 140%;"><strong><span style="font-size: 44px; line-height: 61.6px;"><span style="font-size: 48px; line-height: 67.2px; color: #ffffff; ">New Password</span> <span style="font-size: 72px; line-height: 100.8px; color: #ffffff; "></span> <span style="font-size: 48px; line-height: 67.2px; color: #ffffff;"></span></span></strong></p>
                  </div>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                
                
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:5px 30px 35px;font-family:'Lato',sans-serif;" align="left">
                        
                  <div class="v-text-align" style="color: #ffffff; line-height: 140%; text-align: center; word-wrap: break-word;">
                    <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px;">YOUR NEW PASSWORD IS: 
                    ${newPassword}
                    </span></p>
                  </div>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                  <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
                  </div>
                </div>
                <!--[if (mso)|(IE)]></td><![endif]-->
                      <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                    </div>
                  </div>
                </div>
                
                
                <div class="u-row-container" style="padding: 0px; background-color: transparent">
                  <!-- logoooooo -->
                  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #bafad5;">
                    <div style="border-collapse: collapse;display: table;width: 100%; height: 400px; background-image: url('https://fybe.com.ng/static/media/bike.fc9b82e1c83a54b1588f.png');background-repeat: no-repeat;background-position: center top;background-color: transparent; background-size: cover;">
                      <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-image: url('images/image-9.png');background-repeat: no-repeat;background-position: center top;background-color: #90b0ca;"><![endif]-->
                      
                <!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
                <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
                  <div style="width: 100% !important;">
                  <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
                  
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:7px;font-family:'Lato',sans-serif;" align="left">
                        
                  <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 0px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                    <tbody>
                      <tr style="vertical-align: top">
                        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                          <span>&#160;</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:'Lato',sans-serif;" align="left">
                        
                  <div class="v-text-align" style="line-height: 140%; text-align: center; word-wrap: break-word;">
                    <p style="font-size: 14px; line-height: 140%;"><strong><span style="font-size: 44px; line-height: 61.6px;"><span style="font-size: 48px; line-height: 67.2px; color: #ffffff; "></span> <span style="font-size: 72px; line-height: 100.8px; color: #ffffff; "></span> <span style="font-size: 48px; line-height: 67.2px; color: #ffffff;"></span></span></strong></p>
                  </div>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <table class="hide-mobile" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:75px;font-family:'Lato',sans-serif;" align="left">
                        
                  <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 0px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                    <tbody>
                      <tr style="vertical-align: top">
                        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                          <span>&#160;</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:5px 30px 35px;font-family:'Lato',sans-serif;" align="left">
                        
                  <div class="v-text-align" style="color: #ffffff; line-height: 140%; text-align: center; word-wrap: break-word;">
                    <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px;"></span></p>
                  </div>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                  <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
                  </div>
                </div>
                <!--[if (mso)|(IE)]></td><![endif]-->
                      <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                    </div>
                  </div>
                </div>
                
                
                <div class="u-row-container" style="padding: 0px;background-color: transparent">
                  <div class="u-row" style="Margin: 0 auto;min-width: 320px;  max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #37a565;">
                    <div style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
                      <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: #05559a;"><![endif]-->
                      
                <!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
                <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
                  <div style="width: 100% !important;">
                  <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
                  
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:2px 0px 4px;font-family:'Lato',sans-serif;" align="left">
                        
                  <table height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 0px solid #BBBBBB;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                    <tbody>
                      <tr style="vertical-align: top">
                        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
                          <span>&#160;</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                  <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
                  </div>
                </div>
                <!--[if (mso)|(IE)]></td><![endif]-->
                      <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                    </div>
                  </div>
                </div>
                
                
                
                <div class="u-row-container" style="padding: 0px;background-color: transparent">
                  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #91d4ad;">
                    <div style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
                      <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: #8faac1;"><![endif]-->
                      
                <!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
                <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
                  <div style="width: 100% !important;">
                  <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
                  
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:35px 10px 10px;font-family:'Lato',sans-serif;" align="left">
                        
                <div align="center">
                  <div style="display: table; max-width:300px;">
                  <!--[if (mso)|(IE)]><table width="187" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-collapse:collapse;" align="center"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse; mso-table-lspace: 0pt;mso-table-rspace: 0pt; width:187px;"><tr><![endif]-->
                  
                    
                    <!--[if (mso)|(IE)]><td width="32" style="width:32px; padding-right: 15px;" valign="top"><![endif]-->
                    <table align="left" border="0" cellspacing="0" cellpadding="0"  style="border-collapse: collapse;table-layout: fixed;border-spacing: 0; text-decoration: none; color: white; mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 15px">
                      <tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                        <a href="https://web.facebook.com/Fybelogistics/" title="Facebook" target="_blank" style="text-decoration: none; color: white; ">
                          <p>Facebook</p>
                        </a>
                      </td></tr>
                    </tbody></table>
                    <!--[if (mso)|(IE)]></td><![endif]-->
                    
                
                    
                    <!--[if (mso)|(IE)]><td width="32" style="width:32px; padding-right: 15px;" valign="top"><![endif]-->
                    <table align="left" border="0" cellspacing="0" cellpadding="0"  style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 15px">
                      <tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                        <a href="https://www.instagram.com/fybe_logistics/" title="Instagram" target="_blank" style="text-decoration: none; color: white;">
                          <p>Instagram</p>
                        </a>
                      </td></tr>
                    </tbody></table>
                    <!--[if (mso)|(IE)]></td><![endif]-->
                    
                    <!--[if (mso)|(IE)]><td width="32" style="width:32px; padding-right: 0px;" valign="top"><![endif]-->
                    <table align="left" border="0" cellspacing="0" cellpadding="0" style="text-decoration: none; color: white;  border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;margin-right: 0px">
                      <tbody><tr style="vertical-align: top"><td align="left" valign="middle" style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
                        <a href="https://mobile.twitter.com/Fybe_logistics" title="Twitter" target="_blank" style="text-decoration: none; color: white;">
                          <p>Twitter</p>
                        </a>
                      </td></tr>
                    </tbody></table>
                    <!--[if (mso)|(IE)]></td><![endif]-->
                    
                    
                    <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                  </div>
                </div>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                
                
                <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:5px 10px 10px;font-family:'Lato',sans-serif;" align="left">
                        
                  <div class="v-text-align" style="color: #ffffff; line-height: 140%; text-align: center; word-wrap: break-word;">
                    <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px;"><strong><span style="line-height: 25.2px; font-size: 18px;">fybe.com.ng</span></strong></span></p>
                  </div>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                
                <table id="u_content_text_14" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                  <tbody>
                    <tr>
                      <td style="overflow-wrap:break-word;word-break:break-word;padding:10px 30px 20px;font-family:'Lato',sans-serif;" align="left">
                        
                  <div class="v-text-align" style="color: #ffffff; line-height: 140%; text-align: center; word-wrap: break-word;">
                    <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 12px; line-height: 16.8px;">Copyright &copy; 2022 FYBE</span></p>
                  </div>
                
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                  <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
                  </div>
                </div>
                <!--[if (mso)|(IE)]></td><![endif]-->
                      <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
                    </div>
                  </div>
                </div>
                
                
                    <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
                    </td>
                  </tr>
                  </tbody>
                  </table>
                  <!--[if mso]></div><![endif]-->
                  <!--[if IE]></div><![endif]-->
                </body>
                
                </html>
                  `,
                };

                let emailTransporter = await createTransporter();

                emailTransporter.sendMail(mailOptions, function (err, data) {
                  if (err) {
                    res.send(err);
                  } else {
                    res.send({
                      message: "sucessfully reset password",
                      status: true,
                    });
                  }
                });
              });
            });
          })
          .catch(next);
      });
    })
    .catch(next);
});

module.exports = router;
