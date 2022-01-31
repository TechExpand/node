const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// create vendor schema & model
const VendorSchema = new Schema({
    name: {
        type: String,
        required: [true, 'name field is required']
    },
    start: {
        type: String,
        required: [true, 'start field is required']
    },
    end: {
        type: String,
        required: [true, 'end field is required']
    },
    image: {
        type: String,
        required: [true, 'image field is required']
    },
    deliverytime: {
        type: String,
        required: [true, 'deliverytime field is required']
    },
    specialty: {
        type: String,
        required: [true, 'specialty field is required']
    },
    deliveryfee: {
        type: String,
        required: [true, 'deliveryfee field is required']
    },
});





  

const Vendor = mongoose.model('vendor',VendorSchema);


module.exports = Vendor;
