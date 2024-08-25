const exp = require('express');
const router = exp.Router();
const { isAuthenticated } = require("../MiddleWares/auth.js");
const {
    getAllShifts,getShiftById ,createShift,
    updateShift, deleteShift
} = require("../Controllers/shift.controller.js");

router.route('/shift').get(isAuthenticated, getAllShifts)
.post(isAuthenticated, createShift);
router.route('/shift/:id').get(isAuthenticated, getShiftById)
.put(isAuthenticated, updateShift)
.delete(isAuthenticated, deleteShift);

module.exports = router;