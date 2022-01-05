const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const RecomendSchema = new Schema({
    category: { type: Schema.Types.ObjectId, ref: 'category' },
    vendor: { type: Schema.Types.ObjectId, ref: 'vendor' },
    menu: { type: Schema.Types.ObjectId, ref: 'menu' },
    title: String,
    description: String,
    price: String,
    image: String,
    vendortitle: String,
  });
  
  const Recomend = mongoose.model('recomend', RecomendSchema);

  module.exports = Recomend;
