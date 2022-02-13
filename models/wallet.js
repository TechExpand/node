const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const WalletSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    amount: String,
    email: String,
  });
  
  const Wallet = mongoose.model('wallet', WalletSchema);

  module.exports = Wallet;
