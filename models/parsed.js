const mongoose = require('mongoose')

const parsedSchema = new mongoose.Schema({
  info: {
    type: Array,
    required: true
  }
})

module.exports = mongoose.model('Parsed', parsedSchema)