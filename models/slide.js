
const mongoose = require('mongoose');
const Schema = mongoose.Schema;




  const SlideSchema = new Schema({
    image: String,
  });


const Slide = mongoose.model('slide', SlideSchema);

module.exports = Slide;