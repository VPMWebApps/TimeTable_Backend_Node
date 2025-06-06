const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const yearSchema = new Schema(
  {
    year: {
      type: String,
      required: [true, 'year is required'],
      unique: [true, 'year should be unique'],
      enum: ['FY', 'SY', 'TY'],
      trim: true
    },
  },
  {
    timestamps: true,
  }
);

const Year = models.Year || model("Year", yearSchema);

module.exports = Year;