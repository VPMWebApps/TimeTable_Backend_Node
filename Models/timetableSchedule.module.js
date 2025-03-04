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
    stream: {
      type: Schema.Types.ObjectId,
      ref: 'Stream',
      default: null
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

schema.index({
  date: 1
}, {
  unique: true
});

const TimetableSchedule = mongoose.models.TimetableSchedule || model("TimetableSchedule", schema);

module.exports = {
    TimetableSchedule
}