const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const CouponSchema = new Schema({
    percent: String,
    code: String,
  });
  
  const Coupon = mongoose.model('coupon', CouponSchema);

  module.exports = Coupon;
