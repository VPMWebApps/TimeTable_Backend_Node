const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

//Schema design
const timeSlotSchema = new Schema(
  {
    slotType: {
      type: String,
      required:[true, "Slot number is required"],
      enum: ["Break", "Lecture", "Practical"]
    },
    day: {
      type: String,
      required: [true, "Day required"],
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
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