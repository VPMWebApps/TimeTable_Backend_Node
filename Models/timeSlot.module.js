const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

//Schema design
const timeSlotSchema = new Schema(
  {
    slotType: {
      type: String,
      required:[true, "Slot number is required"]
    },
    startTime:{
      type: String,
      required: [true, "Start time required"]
    },
    endTime:{
      type: String,
      required: [true, "end time required"]
    },
    lecture:{
      type: Schema.Types.ObjectId,
      ref: 'Lecture',
      required: [true, "lecture object required"]
    }
  },
  {
    timestamps: true,
  }
);

//export the slot model
const TimeSlot = models.TimeSlot || model("TimeSlot", timeSlotSchema);

module.exports = TimeSlot;