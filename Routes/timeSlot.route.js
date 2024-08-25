const exp = require('express');
const router = exp.Router();
const { isAuthenticated } = require("../MiddleWares/auth.js");
const {
    getAllSlot, createSlot, getSlotById,
    deleteSlot, updateSlot
} = require('../Controllers/timeSlot.controller.js');

router.use(isAuthenticated);

router.route('/timeslot').get(getAllSlot)
.post(createSlot);
router.route('/timeslot/:id').get(getSlotById)
.delete(deleteSlot)
.put(updateSlot)

module.exports = router;