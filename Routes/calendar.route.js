const exp = require('express');
const router = exp.Router();
const { isAuthenticated } = require("../MiddleWares/auth.js");
const {
    createYearCalendar, deleteAllCalendarEntries,
    deleteCalendarEntriesInRange, deleteCalendarEntryByDate,
    createDayOfCalendar, updateCalendarDay
} = require('../Controllers/calendar.controller.js');

router.route('/calendar').post(isAuthenticated, createYearCalendar)
router.route('/calendar/day').post(isAuthenticated, createDayOfCalendar)
router.route('/calendar').delete(isAuthenticated, deleteAllCalendarEntries)
router.route('/calender-range-delete').delete(isAuthenticated, deleteCalendarEntriesInRange)
router.route('/delete-date').delete(isAuthenticated, deleteCalendarEntryByDate)
router.route('/calendar/:id').put(isAuthenticated, updateCalendarDay);


module.exports = router;