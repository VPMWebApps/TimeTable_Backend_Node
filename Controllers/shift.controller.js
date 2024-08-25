const mongoose = require("mongoose");
const Shift = require("../Models/shift.module");
const TimeSlot = require("../Models/timeSlot.module")
const { TryCatch } = require("../Utils/utility");

//get all shifts
const getAllShifts = TryCatch(async (req, res) => {
  // Fetch all shift documents from the database
  const shifts = await Shift.find().populate("timeSlot");

  // If no shifts are found, send a 404 response
  if (shifts.length === 0) {
    return res.status(404).json({ message: "No shifts found" });
  }

  res.status(200).json(shifts);
});

//get shift by id
const getShiftById = TryCatch(async (req, res) => {
  const { id } = req.params;

  // Validate the ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Shift ID" });
  }

  // Fetch the shift document from the database by ID
  const shift = await Shift.findById(id).populate("timeSlot");

  // If no shift is found, send a 404 response
  if (!shift) {
    return res.status(404).json({ message: "Shift not found" });
  }

  // If shift is found, send it in the response
  res.status(200).json(shift);
});


//create shifts
const createShift = TryCatch(async (req, res) => {
  const { shiftNo, timeSlot } = req.body;

  // Validate the input
  if (!shiftNo || !timeSlot) {
    return res
      .status(400)
      .json({ error: "Please provide both shiftNo and timeSlot" });
  }

  // Validate if the provided timeSlot exists
  const existingTimeSlot = await TimeSlot.findById(timeSlot);
  if (!existingTimeSlot) {
    return res.status(400).json({ error: "Invalid timeSlot ID" });
  }

  // Create a new shift
  const newShift = new Shift({
    shiftNo,
    timeSlot,
  });

  // Save the shift to the database
  const savedShift = await newShift.save();

  res.status(201).json(savedShift);
});

const updateShift = TryCatch(async (req, res) => {
  const { id } = req.params;
  const { shiftNo, timeSlot } = req.body;

  // Validate the ID
  if (timeSlot && !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Shift ID" });
  }

  // Build the update object
  const updateData = {};
  if (shiftNo) updateData.shiftNo = shiftNo;
  if (timeSlot) updateData.timeSlot = timeSlot;

  // Find the shift by ID and update it with the provided data
  const updatedShift = await Shift.findByIdAndUpdate(id, updateData, {
    new: true, // Return the updated document
    runValidators: true, // Ensure validations are run
  }).populate("timeSlot");

  // If no shift is found, send a 404 response
  if (!updatedShift) {
    return res.status(404).json({ message: "Shift not found" });
  }

  // If shift is updated successfully, return the updated document
  res.status(200).json(updatedShift);
});

const deleteShift = TryCatch(async (req, res) => {
  const { id } = req.params;

  // Check if the ID is provided
  if (!id) {
    return res.status(400).json({ error: "Please provide the shift ID" });
  }

  // Find and delete the shift
  const result = await Shift.findByIdAndDelete(id);

  // If no shift is found, send a 404 response
  if (!result) {
    return res.status(404).json({ message: "Shift not found" });
  }

  res.status(200).json({ message: "Shift deleted successfully" });
});



module.exports = {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift
};
