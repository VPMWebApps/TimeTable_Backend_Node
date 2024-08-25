const { Schema, model } = require("mongoose");
const mongoose = require("mongoose");

const schema = new Schema(
  {
    division: {
      type: String,
      required: [true, "Division is required"],
    },
  },
  {
    timestamps: true,
  }
);

const Division = mongoose.models.Division || model("Division", schema);

module.exports = Division;