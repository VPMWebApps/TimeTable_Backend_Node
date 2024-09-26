const { Lecture } = require('../Models/lecture.module.js');
const { TryCatch, ErrorHandler } = require('../Utils/utility.js');

// Create a new lecture

const createLecture = TryCatch(async (req, res, next) => {

    const { lectureType, subject, classroom, professor, division } = req.body;

    if(!subject || !classroom || !professor) return next(new ErrorHandler('Please provide all the necessary details',400));

    const lecture = new Lecture(req.body)
    .populate('subject')
    .populate('classroom')
    .populate('professor')
    .populate('division');
    console.log('lecture>>>>',lecture);
    
    await lecture.save();
    res.status(200).json({
        success: true,
        message: 'Lecture created successfully',
        data: lecture
    });

});

// Fetch all lectures

const getAllLectures = TryCatch(async (req, res, next) => {

    const lectures = await Lecture.find()
    .populate('subject')
    .populate('classroom')
    .populate('professor')
    .populate('division');

    if(!lectures) return next(new ErrorHandler('Lectures not found',400));

    res.status(200).json({
        success: true,
        message: 'Lectures found successfully',
        data: lectures
    });

});

// Fetch lecture by ID

const getLectureById = TryCatch(async (req, res, next) => {

    const lectureId = req.params.id;

    if(!lectureId) return next(new ErrorHandler('Lecture ID not found',404));

    const lecture = await Lecture.findById(lectureId)
    .populate('subject')
    .populate('classroom')
    .populate('professor')
    .populate('division');

    if(!lecture) return next(new ErrorHandler('Lecture not found',404));

    res.status(200).json({
        success: true,
        message: 'Lecture found successfully',
        data: lecture
    });

});

// Update lecture by ID

const updateLecture = TryCatch(async (req, res, next) => {

    const lectureId = req.params.id;
    const { lectureType, subject, classroom, professor, division } = req.body;

    if(!lectureId) return next(new ErrorHandler('Lecture ID not found',404));

    const lecture = await Lecture.findByIdAndUpdate(lectureId, { lectureType, subject, classroom, professor, division }, { new: true, runValidators: true })
    .populate('subject')
    .populate('classroom')
    .populate('professor')
    .populate('division');

    if(!lecture) return next(new ErrorHandler('Lecture not found',404));

    res.status(200).json({
        success: true,
        message: 'Lecture updated successfully',
        data: lecture
    });

});

// Delete lecture by ID

const deleteLecture = TryCatch(async (req, res, next) => {

    const lectureId = req.params.id;

    if(!lectureId) return next(new ErrorHandler('Lecture ID not found',404));

    const lecture = await Lecture.findByIdAndDelete(lectureId)
    .populate('subject')
    .populate('classroom')
    .populate('professor')
    .populate('division');

    if(!lecture) return next(new ErrorHandler('Lecture not found',404));

    res.status(200).json({
        success: true,
        message: 'Lecture deleted successfully',
        data: lecture
    });

});


module.exports = {
    createLecture,
    getAllLectures,
    getLectureById,
    updateLecture,
    deleteLecture
};
