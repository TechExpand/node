
const mongoose = require('mongoose');
const Schema = mongoose.Schema;




  const CategorySchema = new Schema({
    title: String,
    vendor: { type: Schema.Types.ObjectId, ref: 'vendor' },
  });


const Category = mongoose.model('category', CategorySchema);

module.exports = Category;