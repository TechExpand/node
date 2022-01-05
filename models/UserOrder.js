const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const UserOrderSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    menu: { type: Schema.Types.ObjectId, ref: 'menu' },
  });
  
  const userOrder = mongoose.model('userorder', UserOrderSchema);

  module.exports = userOrder;
