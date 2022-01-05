const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const MenuSchema = new Schema({
    category: { type: Schema.Types.ObjectId, ref: 'category' },
    vendor: { type: Schema.Types.ObjectId, ref: 'vendor' },
    title: String,
    description: String,
    price: String,
    image: String,
    vendortitle: String,
  });
  
  const Menu = mongoose.model('menu', MenuSchema);

  module.exports = Menu;
