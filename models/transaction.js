const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const TransactionScema = new Schema({
    message: String,
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    date: String,
    amount: String,
    status: String,
  });
  
  const Transaction = mongoose.model('transaction', TransactionScema);

  module.exports = Transaction;
