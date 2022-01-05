const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const CartSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    menu: { type: Schema.Types.ObjectId, ref: 'menu'},
    quantity: String,
    specialty: String,
  });
  
  const Cart = mongoose.model('cart', CartSchema);

  module.exports = Cart;
