const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const shiftSchema = new Schema(
  {
    shiftNo: {
      type: String,
      required: [true, "Shift number is required"]
    },
    timeSlot: {
      type: Schema.Types.ObjectId,
      ref: 'TimeSlot',
      required: [true, "TimeSlot is required"]
    }
  },
  {
    timestamps: true,
  }
);

const Shift = models.Shift || model("Shift", shiftSchema);

module.exports = Shift;
