const exp = require('express');
const router = exp.Router();
const { isAuthenticated } = require("../MiddleWares/auth.js");
const { 
  getAllLectures,
  createLecture,
  getLectureById,
  deleteLecture,
  updateLecture
} = require("../Controllers/lecture.js");

router.use(isAuthenticated);

router.route('/all-lecture').get(getAllLectures);
router.route('/create-lecture').post(createLecture);
router.route('/lecture/:id').get(getLectureById)
.delete(deleteLecture)
.put(updateLecture);

module.exports = router;