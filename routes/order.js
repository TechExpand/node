const express = require("express");
const router = express.Router();
// const Order = require("../models/order");
const axios = require("axios");
const { google } = require("googleapis");
const SECRET_KEY = "sk_live_15fd431fd077d26edd7f9dfb84fb5d89f361b9d9";
const Order = require("../models/order");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const userOrder = require("../models/UserOrder");
const Cart = require("../models/cart");
const { populate } = require("../models/cart");
const checkAuth = require("../middleware/validate");

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

//clear all order
router.get("/order/clear", function (req, res, next) {
  userOrder
    .find({})
    .then(function (venue) {
      venue.map((v) => {
        return userOrder
          .findByIdAndDelete({ _id: v._id })
          .then(function (venue) {});
      });
      res.send("done");
    })
    .catch(next);
});

router.get("/order", checkAuth, function (req, res, next) {
  userOrder
    .find({ user: req.user })
    .populate("menu")
    .then(function (cart) {
      res.send(cart);
    });
});

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
            User.find({ _id: req.body.user }).then(function (user) {
              Cart.find({ user: req.body.user })
                .populate({
                  path: "menu",
                  populate: {
                    path: "category",
                  },
                })
                .populate({
                  path: "menu",
                  populate: {
                    path: "vendor",
                  },
                })
                .then(async function (cart) {


                  const newValue = [];

                  const menuItem = () => {
                    let index = 0;
                    for (let value of cart) {
                      userOrder.create({
                        menu: value.menu,
                        user: req.body.user,
                      });
                      index++;
                      let template = `
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="v-text-align" style="padding-right: 0px;padding-left: 0px;" align="center">
        
        <img align="center" border="0" src="${value.menu.image}" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 100%;max-width: 186px;" width="186"/>
        
      </td>
    </tr>
  </table>
                            <div class="v-text-align" style="color: #242424; line-height: 140%; text-align: left; word-wrap: break-word;">
                            <p style="font-size: 14px; line-height: 140%;">Menu ${index}.</p>
                            <p style="font-size: 14px; line-height: 140%;">CATEGORY: ${value.menu.category.title}</p>
                            <p style="font-size: 14px; line-height: 140%;">VENDOR: ${value.menu.vendor.name}</p>
                            <p style="font-size: 14px; line-height: 140%;">MENU TITLE: ${value.menu.title}</p>
                            <p style="font-size: 14px; line-height: 140%;">MENU PRICE: ${value.menu.price}</p>
                            <p style="font-size: 14px; line-height: 140%;">MENU QUANTITY: X${value.quantity}</p>
                            <p style="font-size: 14px; line-height: 140%;">MENU DESCRIPTION: ${value.menu.description}</p>
                          </div>`;
                      newValue.push(template);
                    }
                  };

                  menuItem();

                  let mailOptions = {
                    from: user[0].email,
                    to: "fybelogistics@gmail.com,dailydevo9@gmail.com,adexelijah@gmail.com",
                    subject: "FYBE ORDER CREATED",
                    // text:
                    // `
                    // Order:
                    // ${newValue.join("")}
                    // ORDER DESCRIPTION: ${req.body.description},
                    // USER EMAIL: ${user[0].email},
                    // DELIVERY LOCATION: ${req.body.deliverylocation},
                    // NEAREST BUS-STOP: ${req.body.nearestbusstop},
                    // `,

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
      <img align="center" border="0" src="data:image/png;base64,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" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 38%;max-width: 220.4px;" width="220.4"/>
      
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
    <p style="font-size: 14px; line-height: 140%;"><strong><span style="font-size: 44px; line-height: 61.6px;"><span style="font-size: 48px; line-height: 67.2px; color: #ffffff; ">New Order</span> <span style="font-size: 72px; line-height: 100.8px; color: #ffffff; ">Created</span> <span style="font-size: 48px; line-height: 67.2px; color: #ffffff;"></span></span></strong></p>
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
    <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px;">A New Request have been made. Deliver as soon as possible. TREAT AS URGENT!!</span></p>
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


<!-- koooooo start-->
<div>
  <div class="u-row-container" style="padding: 0px;background-color: transparent">
    <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #dff1f7;">
      <div style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
        <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: #dff1f7;"><![endif]-->
        
  <!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
  <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
    <div style="width: 100% !important;">
    <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
    
  <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:5px;font-family:'Lato',sans-serif;" align="left">
          
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
    <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #dff1f7;">
      <div style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
        <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: #dff1f7;"><![endif]-->
        
  <!--[if (mso)|(IE)]><td align="center" width="300" style="width: 300px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
  <div class="u-col u-col-50" style="max-width: 320px;min-width: 300px;display: table-cell;vertical-align: top;">
    <div style="width: 100% !important;">
    <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
    
  <table class="hide-mobile" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:20px;font-family:'Lato',sans-serif;" align="left">
          
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
        <td style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 10px 0px;font-family:'Lato',sans-serif;" align="left">
          
  
  
        </td>
      </tr>
    </tbody>
  </table>
  
    <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
    </div>
  </div>
  <!--[if (mso)|(IE)]></td><![endif]-->
  <!--[if (mso)|(IE)]><td align="center" width="300" style="width: 300px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
  <div class="u-col u-col-50" style="max-width: 320px;min-width: 300px;display: table-cell;vertical-align: top;">
    <div style="width: 100% !important;">
    <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
    
  <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:'Lato',sans-serif;" align="left">
          
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
  
  <table id="u_content_text_3" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:'Lato',sans-serif;" align="left">
          
    <div class="v-text-align" style="color: #242424; line-height: 140%; text-align: left; word-wrap: break-word;">
      <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px;"><strong><span style="line-height: 25.2px; font-size: 18px;">Recieved Menu!</span></strong></span></p>
    </div>
  
        </td>
      </tr>
    </tbody>
  </table>
  
  <table id="u_content_text_4" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:'Lato',sans-serif;" align="left">
    ${newValue.join("")}
    <div class="v-text-align" style="color: #242424; line-height: 140%; text-align: left; word-wrap: break-word;">
      <p style="font-size: 14px; line-height: 140%;">ORDER DESCRIPTION: ${
        req.body.description
      }</p>
      <p style="font-size: 14px; line-height: 140%;">USER EMAIL: ${
        user[0].email
      }</p>
      <p style="font-size: 14px; line-height: 140%;">NEAREST BUS-STOP: ${
        req.body.nearestbusstop
      }</p>
      <p style="font-size: 14px; line-height: 140%;">DELIVERY LOCATION: ${
        req.body.deliverylocation
      }</p>
      <p style="font-size: 14px; line-height: 140%;">USER PHONE NUMBER: ${
        req.body.phone
      }</p>
    </div>
  
        </td>
      </tr>
    </tbody>
  </table>
  
  <table id="u_content_button_1" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:'Lato',sans-serif;" align="left">
          
  
  
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
  
</div>
<!-- koooooo end-->





















<div class="u-row-container" style="padding: 0px;background-color: transparent">
  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #37a565;">
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
                      Cart.find({ user: req.body.user }).then(function (venue) {
                        venue.map((v) => {
                          return Cart.findByIdAndDelete({ _id: v._id }).then(
                            function (venue) {}
                          );
                        });
                        console.log('sucessssssss')
                        res.send({
                          message: "sucessfully ordered",
                          status: true,
                        });
                      });
                    }
                  });
                });
            });
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













router.post("/orderv2/:reference", (req, res, next) => {
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
            User.find({ _id: req.body.user }).then(function (user) {
              Cart.find({ user: req.body.user })
                .populate({
                  path: "menu",
                  populate: {
                    path: "category",
                  },
                })
                .populate({
                  path: "menu",
                  populate: {
                    path: "vendor",
                  },
                })
                .then(async function (cart) {

                  newCart = []
                  newCartID = []
                  cart.map((e) => {
                    if(newCartID.includes(e.menu._id)){
                      objIndex = newCart.findIndex((obj => obj.menu.id == e.menu._id));
                      newCart[objIndex].quantity = String(Number(newCart[objIndex].quantity) + Number(e.quantity))
                    }else{
                      newCartID.push(e.menu._id)
                      newCart.push(e);
                    }
                  });
                 





                  
                  const newValue = [];

                  const totalAmount = 0;

                  const  getTotalAmount = () => {
                    for (let value of newCart) {
                      let totalValue = Number(value.menu.price) * Number(value.quantity)
                      totalAmount = totalAmount + totalValue +  Number(value.menu.containerAmount);
                    }
                  }

                  const menuItem = () => {
                    let index = 0;
                    for (let value of newCart) {
                      userOrder.create({
                        menu: value.menu,
                        user: req.body.user,
                      });
                      index++;
                      let template = `
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="v-text-align" style="padding-right: 0px;padding-left: 0px;" align="center">
        
        <img align="center" border="0" src="${value.menu.image}" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 100%;max-width: 186px;" width="186"/>
        
      </td>
    </tr>
  </table>
                            <div class="v-text-align" style="color: #242424; line-height: 140%; text-align: left; word-wrap: break-word;">
                            <p style="font-size: 14px; line-height: 140%;">Menu ${index}.</p>
                            <p style="font-size: 14px; line-height: 140%;">CATEGORY: ${value.menu.category.title}</p>
                            <p style="font-size: 14px; line-height: 140%;">VENDOR: ${value.menu.vendor.name}</p>
                            <p style="font-size: 14px; line-height: 140%;">MENU TITLE: ${value.menu.title}</p>
                            <p style="font-size: 14px; line-height: 140%;">MENU PRICE: ${value.menu.price}</p>
                            <p style="font-size: 14px; line-height: 140%;">MENU QUANTITY: X${value.quantity}</p>
                            <p style="font-size: 14px; line-height: 140%;">MENU DESCRIPTION: ${value.menu.description}</p>
                          </div>`;
                      newValue.push(template);
                    }
                  };

                  menuItem();
                  getTotalAmount();

                  let mailOptions = {
                    from: user[0].email,
                    to: "fybelogistics@gmail.com,dailydevo9@gmail.com,adexelijah@gmail.com",
                    subject: "FYBE ORDER CREATED",
                    // text:
                    // `
                    // Order:
                    // ${newValue.join("")}
                    // ORDER DESCRIPTION: ${req.body.description},
                    // USER EMAIL: ${user[0].email},
                    // DELIVERY LOCATION: ${req.body.deliverylocation},
                    // NEAREST BUS-STOP: ${req.body.nearestbusstop},
                    // `,

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
      <img align="center" border="0" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAhsAAACOCAYAAACYE8pkAAAABHNCSVQICAgIfAhkiAAAG/9JREFUeF7tnV1aHDcWhqu6YW5msNlB8AqCb8fmCawgeAWBFQRfx3gY23NtsgKTFRivwMxjyK3xCox3ACa5GaBrTtGN0zRdXfo5P6qqjyv7aelIeo+k+ko6UuULLx+/z/CXJIE8L959fXa0O1m5v//nn8u9Qe+1SaXz4uT82dGmSdkKhdJ4eEvFLCoUdbuIojjrD+Y3TncOTn3Kxvj1oRWftn81t0k+Oom3VG+BfHtAqX6oT4kUSgT+e759uKpUVuuKyalDF61rVTsa9IkmttWqh88/Xj7ezbPsZ5Om5sVeGwXHwqtHb7Ii3zBhWuSb588/7PmWjfHrSyw6/T49cJ5EW3EwsLizunTVv/zskBRJdAhAbERwhtiIgCeXtTgb9IrVP3/5/XhWGaZvPoEPRzlmcZbvvXq0VRS5yWoRqf1f/9g+3AppAcRGCLW4POSvNfJXueog/rfwcoUEaPGTeEEowIUAxIYLpYo0EBsR8OSy5k/Otz/s19mnN59FevMpJ73v69JK/D7oDR7WCSKJcrlt0irRKq0SWW0nRk1gEBvcvcHBHm0l9i/nH/pueTlYvpNkuLpxQS8d+f2Q/MjDSiBqrLLWpIHGIDYScxrFaTydFqdRVc1h/EZOgsNkMjqlrZ4HGpOulJtG8S+l0NCP08iymVtlLm2G2HChxJ+GxOm/v24f7vBbvmvx3svHO7Sa8i+NslDGTAIQGxEdBGIjAh5/1vw3WtHY8LVLS63rtNRaBjaq/9Gke9y7mltrouAoV4YG/cv3NJEvq4PL3LbK6uoFsVFHSO73kdA+kSthaHm4gnlB5Zi8UEg3r0n2ITYivAWxEQGPOWvUW65lzEHW0IDR0ckTEmoWf25bZXU1g9ioIyT6+wEFi66JljAyvvBiZYPG2RuNslBGJQGIjYjOAbERAY8vKx17vJpfjj1SZxlM5rv9w8cuzJLl0jQnK4iNMP/z5eIRjS71IV+XqyjfuaRFGhECEBsRWCE2IuBxZeUKtLQOGKVlXqfAVi5uoXZs3xLDtsqq2gqxEdoLmPIpBotabpcy0Wq6GYiNCA9CbETAY8nKfITUeH/3lITTWsonVJoeEDrZ5yA2WEZhlJGYo8u+BZsed/etbPvSQ2xE+BRiIwJefFbet9yb+oweqB/j6+dvIeWA0WshNnfxkS7uWvJvWWwOnq0yiI1YP8jk51qdrKud8THtuuq1/XeIjQgPQ2xEwIvM+omCy8ROQdhuFWRqtyz6+IDiND7anDzJMqmHEVY2fHqAaFrFYNFH+1me/yjaGhifRgBiI6JfQGxEwIvI+oWOzZUBoV7fwfAtz/JKc82lZRcuTbyK3Kld+NyACyadNMxbolWVxjXmOu6cUgrERgR6iI0IeGFZee5XcC174YXhW5DS5FvHwnaVR2ar7KbNWNmo877q72qX3FmePFMlmlZhEBsR/oDYiIAXlFX5AWx8QsU8YNQyfoX6h/jkBLERNArFMmmt6BkHgovxS9yw+HhOvP1R1YPYiMLnl1lrIpqsVVevNB8tN5eBshZXkatslUFs+I1BjdRaH2qzvCtGg2OCZUBsRDgFYiMCnlfWonh3/vzI6LbKLLOMYi9PqNB3JB568YpM3IaryF0QQGy4UNJNo9Xfsbqh61eNlUr1FikWCLGhAzvqKnKuKnbpSvO2BoRO9gWIDa7RwWuH85bYWTWzjUfiZdYAa1jZiHASxEYEPLesugGhdXUyDSxTilexXF7W/Bpo6WuIjboeb/a7YrAorjFX8jLERgRoiI0IeG5Z07vCmx5Qx1T3793qz5tKej/b9Epng60yiA3e/slrTfYk0k1dTfs8L7DUrUFsRHgIYiMCXl1WraXUunpM/m6811u+8T2M/ejctDa37SpyF79CbLhQsksjLa7/EhyPD+jfP9i1tBMlQ2xEuBliIwLe7Kw6bzWh1bc8oSJxpbl1QCjHV3tDfAmxEUJNMQ99qO382dED6RItA8Cl25aQfYiNCGdAbETAm5E1iYDQuqYZB5exXmlOD9331N7VujZL/K719jqt7hAbEh7ltakVx2Maj8WLLFVrEBsRnoHYiIA3PavMB7fYqzkyaHmlOdckbNqGvHj69dnRrpR/6uxCbNQRSuJ3sa3DJFqHSoCAAwE1sWH59ufAodNJTK80z+ICaG1XZ+y3yrTERlvG7+hG3TJA+jvlQc+6kqdcdxQHAtEEIDaiETbfQFOvNDe+ilz0q72uvQpiw5XUX+ms+k1bBJs/ceQAgSyD2EAvuCZgGTCaURBd/3K+PKHi/BXckUD6TFU3uIr8eqtsyae+Ut0MYiOMrMldLAH9PKx1yAUC6RGA2EjPJ2Y1Mo5oPzjfPlxzbTw9LD7Sm+Kya3q+dKld0vaYMMj/tfGtnITaAZFTPS7KFack73GUAAK8BCA2eHk23loTrjTvylXkLp0JKxsulKanGX6o74LiN/L74Vb8c9I9Mw8k7pnxrwlygIAeAYgNPdaNKcn0CF3NleaWYsjqq72zOg7ERtywMgow9lrFi2shcoNAGgQgNtLwQ3K1sLzSfNAbPPzzl9/LEwO3/ky3eQyuInfpFBAbLpRmp7E5jRV3Cmtai8qVmsvelegpm6J/dTZtbMZ7ARbaTgBio+0eDmxfAleal0vN3wJGu3gVuYvrIDZcKM1OY3IcViBYVCnoFRdbxXe5TlqA2Oik290abXlCZfxKc+uryAe9YjXVtzmIDbe+XJfKYtWMO1gUYqPOy/jdkgDEhiX9BpRttKc9JJMXe/RdiU16oL6l/63b4OJf7uZsB8QGD00LsZHVxCf5tgxiw5cY0msSgNjQpN3QskyvA8+yY5sjrqR1jK8id+kuEBsulBy2UeYuPtLDfynemrMF9u0IiA1n9khoQABiwwB6E4u0CaKzJGV/FblL6yE2XCjNTmMhpquCoGNaA7ERQw95pQlAbEgTbol94yvNtSk24qu9JRSIjbiuYbF9InWEGmIjri8gtywBiA1Zvq2ybhkwqgcynavIXdoMseFCqToNXRD3WXf7RK5/QWzE9QXkliUAsSHLt3XWLd4ENSFKLG9L1h9iI5yu0sP5dgWZg0LHjSu1hz3WJNyDyNkkAhAbTfJWInU1PaEiyUDwQSBVbYiNMLJGX34VfVBDbIT1BeTSIQCxocO5daWYXmkuQrMZAaGTTYfYCOsMFh/yk141g9gI6wvIpUMAYkOHcytLsbzSnBmo6Bsnc11vmYPY8Ker9FC+VTGpoFBso/j7HzlsCKiJDbotb2tQ5He+d2HTbJtS5wb9T+NXcNvUgq9Uk2ue+ap/Y+kLfYVzual+0RIbbRm/eS9bzIpij5y/yN+VKi2q9DElEdVYYa7obxQ1hYCa2AD9Zi7T1/mt2SdUirOUryKvY1/+riU2XOqCNFUEdG6hhdhAD0yZAMSGjncac29DCI7mBozqPARCmLrmgdhwJWWWTm0lAGLDzMco2IEAxIYDpLgkcufq4+rFm1tpomOrNPdHsNgq5mkIYsMTmHJy2qIrv158olGs0hhUE08azFCGHgGIDWHW0hHowtX3Mt+YK82L4t358yOjD7t5Ia1NDLFRi8gsgbagtRYbSuWb+ZMKhtCKoA+xEQGvNmsD722obdOMBA250rxVW1oQGzE9VjSvSlDoeAuUHvYzH7jtOxJ/q49AbEQMGYiNCHizsmocdROqepRZEhxLV/0LOnWU348yJJL5ekurPHmisqwt0oQJoxAbGpRDytCPB0pBbDTkhSPEoWUeiI1QcpQPYiMC3oysne6UqV5pTgJw7Y/twwMZl9tYhdiw4V5Tqsn4T0FslFzSfuGI6i8mfo2qcUKZITb4ndGqZfpQPMmdUGnplhbERmgPlcunGRQ63opUxEZZJ6Pr4OWcOrQMsRFBGGIjAt7drM2/t4ETRzr7t+2846T0FcQGZ4+Nt6UdFJqq2Ljumy9WNrK8eBNPNRkLEBsRroDYiIB3N6v+Pi1r9QWMJXCl+afz7cNlgaYlYRJiIwk33FRCPSg0ZbFR1o22VHdJgP2clJfCKwOxEc4OMRsR7G5lzfPi6ddnR7tc9tpix/ZK8/bfcQKxkc5IsQ4KT2kbZdwr1EcP6P8/pOOp4JpAbASjQ4BoBLrxrO1dpucAZHOleTe2tCA2OHoom41Titd4aHXaKVWx0aITKhAbEUMF2ygR8EZZERDqwFB9/7alAaGTqCE2HDqfbpJ92rZ7olvksLRUxUZZN5sXDnYvQGxEIIXYiICXZe1fpo/CM5FZcf+2M5MCxAZnD+WxZXXEOmWxUZKlgHG6tbd4y0PZxEpn5hUJuhAbwVS7sUwfjGdKRqXJsCy5M5MCxAZnD2WylRcn/cv5cjvllMmikxml8RU1tu69erRVFPlrpwallyiq7ek1R7dGEBuhvDuyTB+KZ1o+pckQYoPTabAVRMDiCKzS+Ip+4KZzJN7btdFt9y6xRRkgNgKcaR11HlDlJLIoTYYQG0l4G5XQvtxLaXyxPHATOBIf0kFZ2h5ScBvyQGz4erFFXwz1bXpseqXJEGIj1lHIz0XggIJF17iM1dlRGl8sD9zhCZWLkzS/oVRJmqXtdX5s6+8QG36exckTP163UitNhhAbET5CVm4Cehf9KY0vtgduA0+osLWdu5c1wR7EhrOXEBDqjKoiodJkCLER6yjk5yOgGCyqNL5YH7jqR+LjPMva9riqNC83xIajz6yOszlWrxHJlCZDiI1G9IbuVFIrWFRpfLE/cBWPxMd2Ova2x1aoSfnVxEZ5nfegyI+bBOemrkVvcPrnL783su4p8VaaDCE2BJze5PE7jiPP8sUsG+xpxwpoBIsqjS+RB+7Ci0f7WZ7/KNB1OU2KtJ2zginbUhMbWBlIuRvo1E1pMoTYEHBnm8av0V0P4sGiSuNL5IHbkCvNRdouMFyTNAmxkaRb2lkppckQYkOg+7RJbJR4bI5eygaLKo0vsQcuCY4lOqFCK8j5fYEuzGFSrO0clUvdBsRG6h5qUf2UJkOIDYE+0zaxMTwJ0fsogKrapHCwqNL4En3gUvzGKsW4vFf1i3thom13r0YzU0JsNNNvjay10mQIsSHQO9omNkpEiv3xm0ckg0WV2iP+wE34hIp42wWGbjImITaScUX7K6I0GUJsCHSlNooNq+0UqWBRpfGFB67A+OqCSYiNLng5kTYqTYYQGwL+bqvYMNlOyTKRYFGl8QWxITC+umASYqMLXk6kjUqTIcSGgL/bKjastlMoCPLJ+faHfU5XKY0viA1Op3XIFsRGh5xt3VSlyRBiQ8DRbRYbRtspp6PtFLbP0CuNL4gNgfHVBZMQG13wciJtVJoMITYE/N12sWGxncL99Wil8QWxITC+umASYqMLXk6kjUqTIcSGgL/bLjYWXq6sZ1nxVgBdtcki3zx//mGPq0yl8QWxweWwjtmB2OiYwy2bqzQZQmwIOLnNYmN4mdRleecGXWWu9sf+0FYaX+z1ViOOgkwJQGyY4u9W4UqTIcSGQLdqs9igfvmR2rcsgK3S5KA3eMj9vSWl8QWxodlRWlQWxEaLnJl6U5QmQ4gNgY7QVrGh2Ce/eUXqYi+ltkBsCIyvLpiE2OiClxNpo9JkCLEh4O82ig2jq7G/0CmU5dOdA7ZTKDfuVhpfEBsC46sLJiE2uuDlRNqoNBlCbAj4u21iY/SV0c+ESjNOg4rjv18DYkOgw8MkOwGIDXakMFhFAGKDv2/Q10tJB8j/tU1sELfy5AmdQFH9E10VUBpfom1Q9QYKUyUAsaGKu9uFKU2GWNkQ6GZtEhv3Xj3aKor8tQCmmSalvomClQ1tT6K8EAIQGyHUkCeIAMRGELaZmbRWNrK82KMH9Al/C/QtUoDmjnapUkGh4+1QGl9Y2dDuPC0pD2KjJY5sQjOUJkOsbDShM3Srjl/Otw+XpJusNL4gNqQd2VL7EBstdWyKzVKaDCE2UnR+h+uktQWlNL7KUzTHXXQn+fHTH9uHW11sO0ebITY4KMKGEwGlyRBiw8kbSKRCoCjenT8/UglEVRxfKugSLASrOhFOgdiIgIesfgQUJ8POTApqMRt+rkbqawLFWf9qvrxT40QDiOL40mhOimV0Zl6RgA+xIUEVNqcSUJwMOzMpQGykO9g0gkLHW684vtKFLluzzswrEhghNiSowibEhlIfgNhQAu1fzCcKClX93grEhr+TPHNAbHgCG08OsREBD1n9CChOhp2ZFCA2/PqgVmqtoFCsbGh59LqczswrElQhNiSowiZWNpT6AMSGEmivYvLfzrc/bHhlYUisKOYZattIExAbEW6D2IiAh6x+BBQnw85MChAbfn1QPvV1UOiSxIfW6uquOL7qqtLW3zszr0g4EGJDgipsYmVDqQ9AbCiBdiwmz4unX58d7TomZ00GscGKc5oxiI0IxBAbEfCQ1Y+A4mTYmUkBYsOvDwqnVg8KHW+P4vgSxpis+c7MKxIegNiQoAqbWNlQ6gMQG0qgHYoZ9AYP//zld7PbNSE2HJwUlwRiI4IfxEYEPGT1I6A4GXZmUoDY8OuDUqnp9Mmv1ldZK44vKYyp2+3MvCLhCIgNCaqwiZUNpT4AsaEEemYxdkGh2EZR9T/ERgRuiI0IeMjqR0DxzaszkwLEhl8fFEld5Jvnzz/sidj2MKo4vjxq1aqknZlXJLwGsSFBFTaxsqHUByA2lEBXF5PMAwhiQ7wvJONr8ZYKFACxIQAVJqcTUJwMOzMpQGzYjjbroFBso6j6vzPzigRViA0JqrCJlQ2lPgCxoQR6SjHaH1qra6mimK+rSlt/9xYbizurixfz/1viPqX0j5ePVykg+YATNNW1vIzuhNPmuC2IDSmysHuHgOJk6D0pNNVdEBtmnvvSv5orPx9/alaDiYIVx1cqTdauh9e8UgqNQf/yPZ1UWqIVsDUuwUFCY5eE7s8ZY6zQ3//zz+XeoPc+y4v9/uX8U4l+DbGh3V07XJ7iZOg1KTTZJRAbVt7Ln9D3T/atSp9WruL4SqnZmnXxmldobL6lyq2PKnjKITgWXqxskCB4863RDILjm9DIssXSLgmZ497V3Bq34IDY0OyqHS9LcTL0mhSa7BaIDRPvJdm/FMeXCfQECnX2+x1RMKw8rYLRyaVAkVpuc1z1Lz9PciiKfPeP5x+ehvKhOaS8iO778fwSggNiI9RDyOdNQHEydJ4UvBuRWAaIDX2H0PbJA8m97dAWKY6v0Co2PZ/XvLLwcmUvy4qf7jQ6YjWiQsSQhin2zp8dbYYALrd7SMQcVAiOJ1x9HWIjxDvIE0RAcTL0mhSCGpNIJogNXUekFhQ63nrF8aULPZ3SvOeVe68ebdHKw2tOwTHc9shJHOT3b9kVEBzlagzH9k9ZTyWxUZwNesUqV4BMOn0PNfEhoDYZRrw5+LQnhbRlVHoK9ehKHeau5o6597K52KmNL64KN8+Ot9gom1i1GkGBozt0ouTfIRiqBEfM9sdohaOMQ/phok4sgkNDbPyXlh03uJZiQhyDPGkQUJgMP5EK34CoTcPfqIUugXJP/7J/uaRbandKK3qD09C5RWL7Q0JwXIuj6ds/pySOnsQctxUVG3lePP367Gi3O90RLZ1FQFJspLy8jV4BAiAAAuUqZJ4VtHIgv/0Rs8IxQ3BQCEr41fxSYgNvmBhbdwgIiY0vpLg3YhQ3XAUCIAACGgQq4y2ybJ92ADZDtuiqAjypPVHbH5XzdaDgYBcbeMPU6LLNLINfbOS/9a/6WyEDtJkEUWsQAIGmE5DY/pCKt6ja/qHn/NbX7cNffXzBKTbwhulDvoNp+cRGcZZlvY3Q8+odRI8mgwAIJERgdGdGGYzJer9FVbxFzIkSrngTFrFBy9i/UpT2Dt4wE+rNCVaFSWyUAcfr6GsJOhhVAgEQcCYw636Lq95gMzgYVeJ+j5crdBPqYC8m3iRSbOAN07lnIWEWJzaKszzPdhBwjI4EAiDQFgJS8Rbfvp8yCSow3qI0M+t+D5fvqYSLjaJ41x/Ml0dak/kQUVs6YFvbESE2EHDc1k6BdoFAxwkMBccVndq8c9toVIBn5faHgOBwOf0SIDawmtHxsRHc/BCxgYDjYNzICAIg0CACVfEWMd9T4Yq3GMc4+nAbban4xZv4ig1c0NWgzptaVT3FBgKOU3Mg6gMCICBKQO57KgNaOVG732Pq91QcxQb2y0V7WEeMu4sNHGntSJdAM0EABCYItPV7Ki5iA/vlGA4sBOrFBrboWEDDCAiAQKMJNOp7Kr2LvSzPf5wAfifeZKbYwH55o/trcpWvERs40pqcx1AhEAABKwKC8Rbl/R7fjbfLJcBzFgeX76lUiY0vdAnIeug5XyvnoNy0CUwXG9iiS9trqB0IgIAVgTZ9T+WO2MAFXVbdqv3lThEbn0YXdJ20v/VoIQiAAAj4ExgKjuz93Zz5b3SL8oa/xSwb3e/xmfIuTuQ/pTn5QeiVFlUBrqQr1sbFBqL/Q7yGPM4ExsUGtuicsSEhCIBARwmUomDQv3xPD+vl2wiKs0GvWA3dfVh49egNfcH1rlCJuINjJIre3hUwQ1E0FBu4oKujXVm32SOxsYEtOl3uKA0EQKB5BKqFRlauCK8Grz5MFRrFWZHl66Ffz66ML8n+Wn0hsbGyjg9aNa8jNrHG5WUw8xd/OwkdJE1sM+oMAiAAAr4ERhdnlVsnk9scwUJjtHVSrjyssq6SvFjZyPLizWQbJ1ev6f/4AwEQAAEQAAEQSIHADKERfGJPajuGtk7+RSJi5w63KdsxEBsp9C7UAQRAAARAoPME6uIeQgDVbMeUX9A+CbHrG/cBsRFCGXlAAARAAARAgJGAS9yDb3HXqyRF/paCQZcm8gZvx5R2pguN2ZcyQmz4eg/pQQAEQAAEQICRQJXQiDm1Jxj3UcZnrN9ufv3pGIgNxg4DUyAAAiAAAiDgQ4BO6f1MR1vpQ2kTfxHHUKuFRtzdHDHHcCE2fHoF0oIACIAACIAAEwHfuAeXYiW2YzjiPiA2XLyHNCAAAiAAAiDASCAk7qGueAmhwRX3AbFR5z38DgIgAAIgAAJMBEb3XQTFPcyqQqXQENmO8b9YDGKDqQPBDAiAAAiAAAjMIiB134XEdgx33AfEBsYGCIAACIAACAgT4Ih7mFbFyu2Yord1/vzDXkizRqskrynvxA2m4QGmEBshnkAeEAABEAABEHAkUK4S9Ae9N3c/qOa/HXFT5PV2zNzF67sfVKs/hhq0HTP2nRPHZt9KBrERQg15QAAEQAAEQMCBgNR9FzHHUKuqLRH3cVMWxIZDZ0ESEAABEAABEPAlMCvuoX/V3wr5KOWs7Rj6ovZGSp+dH+cFseHbe5AeBEAABEAABBwILLx4tJ/l+Y+3k4bHPZR2KlYfoq4fJwGzdNW/OM6y/P5fdaXrxyPiPibxQGw4dBgkAQEQAAEQAAFfAqNjrgeU7/th3jihcVP+wsuVvSwrfhr9P0po3NgcrsLkVNdScMTFfUzjBLHh23uQHgRAAARAAAQcCXwTHEW+G3o6ZFpR14KjGCz2B/MbIdsxFTbpmyeDvUGvWA3djqnCArHh2GGQDARAAARAAATaTqAUR1ziZZzV/wFosdaZyW8lpAAAAABJRU5ErkJggg==" alt="Image" title="Image" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 38%;max-width: 220.4px;" width="220.4"/>
      
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
    <p style="font-size: 14px; line-height: 140%;"><strong><span style="font-size: 44px; line-height: 61.6px;"><span style="font-size: 48px; line-height: 67.2px; color: #ffffff; ">New Order</span> <span style="font-size: 72px; line-height: 100.8px; color: #ffffff; ">Created</span> <span style="font-size: 48px; line-height: 67.2px; color: #ffffff;"></span></span></strong></p>
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
    <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px;">A New Request have been made. Deliver as soon as possible. TREAT AS URGENT!!</span></p>
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


<!-- koooooo start-->
<div>
  <div class="u-row-container" style="padding: 0px;background-color: transparent">
    <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #dff1f7;">
      <div style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
        <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: #dff1f7;"><![endif]-->
        
  <!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
  <div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
    <div style="width: 100% !important;">
    <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
    
  <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:5px;font-family:'Lato',sans-serif;" align="left">
          
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
    <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #dff1f7;">
      <div style="border-collapse: collapse;display: table;width: 100%;background-color: transparent;">
        <!--[if (mso)|(IE)]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: #dff1f7;"><![endif]-->
        
  <!--[if (mso)|(IE)]><td align="center" width="300" style="width: 300px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
  <div class="u-col u-col-50" style="max-width: 320px;min-width: 300px;display: table-cell;vertical-align: top;">
    <div style="width: 100% !important;">
    <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
    
  <table class="hide-mobile" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:20px;font-family:'Lato',sans-serif;" align="left">
          
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
        <td style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 10px 0px;font-family:'Lato',sans-serif;" align="left">
          
  
  
        </td>
      </tr>
    </tbody>
  </table>
  
    <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
    </div>
  </div>
  <!--[if (mso)|(IE)]></td><![endif]-->
  <!--[if (mso)|(IE)]><td align="center" width="300" style="width: 300px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
  <div class="u-col u-col-50" style="max-width: 320px;min-width: 300px;display: table-cell;vertical-align: top;">
    <div style="width: 100% !important;">
    <!--[if (!mso)&(!IE)]><!--><div style="padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
    
  <table style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:'Lato',sans-serif;" align="left">
          
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
  
  <table id="u_content_text_3" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:'Lato',sans-serif;" align="left">
          
    <div class="v-text-align" style="color: #242424; line-height: 140%; text-align: left; word-wrap: break-word;">
      <p style="font-size: 14px; line-height: 140%;"><span style="font-size: 18px; line-height: 25.2px;"><strong><span style="line-height: 25.2px; font-size: 18px;">Recieved Menu!</span></strong></span></p>
    </div>
  
        </td>
      </tr>
    </tbody>
  </table>
  
  <table id="u_content_text_4" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:0px 10px 10px;font-family:'Lato',sans-serif;" align="left">
    ${newValue.join("")}
    <div class="v-text-align" style="color: #242424; line-height: 140%; text-align: left; word-wrap: break-word;">
      <p style="font-size: 14px; line-height: 140%;">ORDER DESCRIPTION: ${
        req.body.description
      }</p>
      <p style="font-size: 14px; line-height: 140%;">USER EMAIL: ${
        user[0].email
      }</p>
      <p style="font-size: 14px; line-height: 140%;">NEAREST BUS-STOP: ${
        req.body.nearestbusstop
      }</p>
      <p style="font-size: 14px; line-height: 140%;">DELIVERY LOCATION: ${
        req.body.deliverylocation
      }</p>
      <p style="font-size: 14px; line-height: 140%;">USER PHONE NUMBER: ${
        req.body.phone
      }</p>
      <p style="font-size: 14px; line-height: 140%;">FOOD TOTAL AMOUNT: ${
        totalAmount
      }</p>
      
    </div>
  
        </td>
      </tr>
    </tbody>
  </table>
  
  <table id="u_content_button_1" style="font-family:'Lato',sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
    <tbody>
      <tr>
        <td style="overflow-wrap:break-word;word-break:break-word;padding:10px;font-family:'Lato',sans-serif;" align="left">
          
  
  
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
  
</div>
<!-- koooooo end-->





















<div class="u-row-container" style="padding: 0px;background-color: transparent">
  <div class="u-row" style="Margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #37a565;">
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
                      Cart.find({ user: req.body.user }).then(function (venue) {
                        venue.map((v) => {
                          return Cart.findByIdAndDelete({ _id: v._id }).then(
                            function (venue) {}
                          );
                        });
                        console.log('sucessssssss')
                        res.send({
                          message: "sucessfully ordered",
                          status: true,
                        });
                      });
                    }
                  });
                });
            });
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
