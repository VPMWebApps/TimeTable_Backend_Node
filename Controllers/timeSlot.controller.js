const mongoose = require("mongoose");
const TimeSlot = require("../Models/timeSlot.module");
const {Lecture} = require("../Models/lecture.module")
const { TryCatch, ErrorHandler } = require("../Utils/utility");

//Get each & every slot
const getAllSlot = TryCatch(async (req, res, next) => {

  const slots = await TimeSlot.find().populate({
    path: 'lecture',
    populate: [{ 
      path: 'subject',
    },{
      path: 'professor',
    },{
      path: 'classroom',
    },{
      path: 'division',
    }]
  });

  if(!slots) return next(new ErrorHandler("No slots found", 404));

  res.status(200).json({
   success: true,
    message: "Slots found successfully",
    slot: slots
  });

});

//create slot
const createSlot = TryCatch(async (req, res, next) => {
  const { slotType, day, startTime, endTime, lecture } = req.body;

  // Validate required fields
  if (!slotType || !day || !startTime || !endTime || !lecture) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields: slotType, startTime, endTime, and lecture."
    });
  }

  // Validate that the lecture field is a valid ObjectId
  // Optionally: Validate if the lecture ObjectId exists in the Lecture collection
  const lectureExists = await Lecture.findById(lecture);
  if (!lectureExists) {
    return res.status(404).json({
      success: false,
      message: "Lecture not found"
    });
  }

  // Create a new slot document
  const newSlot = new TimeSlot({
    slotType,
    day,
    startTime,
    endTime,
    lecture // Assuming this is an ObjectId reference to the Lecture model
  })

  // Save the new slot to the database
  await newSlot.save();

  // Populate the lecture field in the response
  const populatedSlot = await newSlot.populate({
    path: 'lecture',
    populate: [{ 
      path: 'subject',
    },{
      path: 'professor',
    },{
      path: 'classroom',
    },{
      path: 'division',
    }]
  });

  res.status(201).json({
    success: true,
    message: "Slot created successfully",
    slot: populatedSlot
  });
});


//Get specific slot
const getSlotById = TryCatch(async (req, res, next) => {

    const slotId = req.params.id;

    if (!slotId)  return  next(new ErrorHandler("Slot ID is required", 400));

    const slot = await TimeSlot.findById(slotId).populate({
      path: 'lecture',
      populate: [{ 
        path: 'subject',
      },{
        path: 'professor',
      },{
        path: 'classroom',
      },{
        path: 'division',
      }]
    });

    if (!slot)  return  next(new ErrorHandler("Slot not found", 404));

    res.status(200).json({
      success: true,
      message: "Slot found successfully",
      slot: slot
    });
  
});

//Delete slot
const deleteSlot = TryCatch(async (req, res, next) => {

    const slotId = req.params.id;

    // Validate the ObjectId format
    if (!mongoose.Types.ObjectId.isValid(slotId)) return  next(new ErrorHandler("Invalid slot ID format", 400));

    //Find slot & delete
    const result = await TimeSlot.findByIdAndDelete(slotId);
    if (!result)  return next(new ErrorHandler("Slot not found", 404));

    res.status(200).json({ 
      success: true,
      message: "Slot deleted successfully" 
    });
  
});

//Modify slot
const updateSlot = TryCatch(async (req, res, next) => {

    const slotId = req.params.id;
    const { slotType, day, startTime, endTime, lecture } = req.body;

    // Validate the ObjectId format
    if (!mongoose.Types.ObjectId.isValid(slotId)) return  next(new ErrorHandler("Invalid slot ID format", 400));

    const updatedSlot = await TimeSlot.findByIdAndUpdate(
      slotId,
      { slotType, day, startTime, endTime, lecture }, //value to be updated
      { new: true, runValidators: true } //new: make sure value remains updated, rV:updated value is being cross verified with model
    ).populate({
      path: 'lecture',
      populate: [{ 
        path: 'subject',
      },{
        path: 'professor',
      },{
        path: 'classroom',
      },{
        path: 'division',
      }]
    });

    if (!updatedSlot) return  next(new ErrorHandler("TimeSlot not found", 404)); //if any issue during above operation, 404 err

    res.status(200).json({
      success: true,
      message: "TimeSlot updated successfully",
      slot: updatedSlot
    }); // or else updated successuffy
  
});

//export the module
module.exports = {
  getAllSlot,
  createSlot,
  getSlotById,
  deleteSlot,
  updateSlot,
};
