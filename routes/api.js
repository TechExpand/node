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
              })
                .then(function (vendor) {
                  let token = jwt.sign({ id: createduser._id }, TOKEN_SECRET, {
                    expiresIn: "3600000000s",
                  });
                  res.send({
                    id: createduser._doc._id,
                    token: token,
                    fullname: fullname,
                    email: createduser._doc.email,
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
  res.send({message: 400});
});



//get all users
router.get("/users", checkAuth, function (req, res, next) {
  User.find({}).then(function (users) {
    res.send(users);
  });
});

//get profile of a particular user
router.get("/profile/", checkAuth, function (req, res, next) {
  Profile.find({ user: req.user }).then(function (profile) {
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

//create cart for a user
router.post("/cart", function (req, res, next) {
  Cart.create(req.body)
    .then(function (cart) {
      res.send(cart);
    })
    .catch(next);
});

//delete user cart
router.delete("/cart/:id", function (req, res, next) {
  Cart.findByIdAndDelete({ _id: req.params.id })
    .then(function (student) {
      res.send(student);
    })
    .catch(next);
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
      "1//04mWZfB5m6hJhCgYIARAAGAQSNwF-L9IrNsMYtGUWmbYLrej8tzhKK9_cC3ZYEf4Ga33dTHACZ8MilXQwZ68emmxvH9Yk3js9mM0",
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
                  text: `
                    Hello ${userinfo.name},

                    Thanks for using our Fybe App.

                    Here is your new password:
                    

                    ${newPassword}
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
