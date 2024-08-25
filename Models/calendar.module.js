const { Schema, model } = require("mongoose");
const mongoose = require("mongoose");


const schema = new Schema(
  {
    
    jsDate: {
      type: Date,
      required: true,
      trim: true
    },
    date: {
      type: String,
      required: true,
      trim: true
    },
    dayOfWeek: {
      type: String,
      required: true,
      trim: true
    },
    month: {
      type: String,
      required: true,
      trim: true
    },
    shifts:[{
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      default:[]
    }],
    holiday:{
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
  }
);

const Calendar = mongoose.models.Calendar || model("Calendar", schema);

module.exports = {
    Calendar
}