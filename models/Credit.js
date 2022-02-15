const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const CreditSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    message: String,
    title: String,
  });
  
  const Credit = mongoose.model('credit', CreditSchema);

  module.exports = Credit;
