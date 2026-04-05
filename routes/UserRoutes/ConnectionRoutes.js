const express = require("express");
const router = express.Router();

const {
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  removeConnection,
  getAcceptedConnections,
  getIncomingRequests,
  getOutgoingRequests,
  withdrawConnection,
} = require("../../controllers/user/ConnectonController");

const { authMiddleware } = require("../../controllers/auth/authController");

router.use(authMiddleware)

// Send connection request
router.post("/send", sendConnectionRequest);

// Accept connection request
router.patch("/:connectionId/accept", acceptConnection);

// Reject connection request
router.patch("/:connectionId/reject", rejectConnection);

// Remove an accepted connection
router.delete("/:connectionId", removeConnection);

// Get accepted connections (paginated)
router.get("/accept", getAcceptedConnections);

// Get incoming pending requests
router.get("/incoming", getIncomingRequests);

// Get outgoing pending requests
router.get("/outgoing", getOutgoingRequests);


router.delete("/:connectionId/withdraw",  withdrawConnection);

module.exports = router;
