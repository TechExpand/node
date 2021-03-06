const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const ProfileSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user' },
    name: String,
    email: String,
    deliveryfee: String,
    image: String,
    dateofbirth: String,
    dateofbirth: String,
  });
  
  const Profile = mongoose.model('profile', ProfileSchema);

  module.exports = Profile;
