const { TryCatch, ErrorHandler } = require('../Utils/utility.js');
const Division = require('../Models/division.module.js');

// Get all the divisions

const getAllDivisions = TryCatch(async (req, res, next) => {

    const divisions = await Division.find();

    if(!divisions) return next(new ErrorHandler('Divisions not found',400));

    res.status(200).json({
        success: true,
        message: "Divisions found successfully",
        division: divisions
    });
});

// create a new division

const createDivision = TryCatch(async (req, res, next) => {

    const { division } = req.body;

    if(!division) return next(new ErrorHandler('All neccessory inputs are required', 400));

    const newDivision = new Division({ division });
    await newDivision.save();

    const div = await Division.findById(newDivision._id);

    res.status(201).json({
        success: true,
        message: "Division created successfully",
        division: div
    });

});

// get a single division

const getDivisionById = TryCatch(async (req, res, next) => {

    const divisionId = req.params.id;

    if (!divisionId)  return  next(new ErrorHandler("Division ID is required", 400));

    const division = await Division.findById(divisionId);

    if(!division) return next(new ErrorHandler('Division not found',404));

    res.status(200).json({
        success: true,
        message: "Division found successfully",
        division: division
    });
});

// update a division

const updateDivision = TryCatch(async (req, res, next) => {

    const divisionId = req.params.id;

    if (!divisionId) return next(new ErrorHandler('Division ID is required', 400));

    const { division } = req.body;

    if(!division) return next(new ErrorHandler('All neccessory inputs are required', 400));

    const updatedDivision = await Division.findByIdAndUpdate(divisionId, { division }, { new: true, runValidators: true });

    if (!updatedDivision) return next(new ErrorHandler('Division not found', 404));

    res.status(200).json({
        success: true,
        message: "Division updated successfully",
        division: updatedDivision
    });

});

// delete a division

const deleteDivision = TryCatch(async (req, res, next) => {

    const divisionId = req.params.id;

    if (!divisionId) return next(new ErrorHandler('Division ID is required', 400));

    const division = await Division.findByIdAndDelete(divisionId);

    if (!division) return next(new ErrorHandler('Division not found', 404));

    res.status(200).json({
        success: true,
        message: "Division deleted successfully",
        division: division
    });

});

module.exports = {
    getAllDivisions,
    createDivision,
    getDivisionById,
    updateDivision,
    deleteDivision
};