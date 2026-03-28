const express = require("express");
const router = express.Router();
const {
  getFilteredEvents,
  getEventDetails,
  registerForEvent,
  getMyRegisteredEvents,
  getEventPage,
} = require("../../controllers/user/UserEventController");
const { authMiddleware } = require("../../controllers/auth/authController");

// Safety guard — if getEventPage is missing from the controller (e.g. stale
// deploy), log a clear error instead of silently crashing the entire router.
if (typeof getEventPage !== "function") {
  console.error(
    "❌ FATAL: getEventPage is not exported from UserEventController. " +
    "The /:eventId/page route will not work. Check your deployed controller file."
  );
}

// ORDER MATTERS: static routes must come before dynamic (:param) routes.
router.get("/filter", getFilteredEvents);
router.get("/my-registrations", authMiddleware, getMyRegisteredEvents);
router.get("/get/:id", getEventDetails);

// Dynamic routes last
router.post("/:eventId/register", registerForEvent);
router.get(
  "/:eventId/page",
  typeof getEventPage === "function"
    ? getEventPage
    : (req, res) =>
        res.status(500).json({
          success: false,
          message: "getEventPage not available — check server deployment",
        })
);

module.exports = router;
// const express = require("express");
// const router = express.Router();
// const { getFilteredEvents, getEventDetails, registerForEvent, getMyRegisteredEvents ,getEventPage} = require("../../controllers/user/UserEventController");
// const { authMiddleware }  = require("../../controllers/auth/authController");


// router.get("/filter", getFilteredEvents);
// router.get("/get/:id", getEventDetails);
// router.post("/:eventId/register", registerForEvent);
// router.get("/my-registrations",authMiddleware, getMyRegisteredEvents);
// router.get("/:eventId/page", getEventPage);

// module.exports = router;
