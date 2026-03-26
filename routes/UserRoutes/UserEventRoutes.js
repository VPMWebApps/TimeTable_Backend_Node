const express = require("express");
const router = express.Router();
const { getFilteredEvents, getEventDetails, registerForEvent, getMyRegisteredEvents ,getEventPage} = require("../../controllers/user/UserEventController");
const { authMiddleware }  = require("../../controllers/auth/authController");


router.get("/filter", getFilteredEvents);
router.get("/get/:id", getEventDetails);
router.post("/:eventId/register", registerForEvent);
router.get("/my-registrations",authMiddleware, getMyRegisteredEvents);
router.get("/:eventId/page", getEventPage);

module.exports = router;
