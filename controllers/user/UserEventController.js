const EventRegistration = require("../../models/RegisterEvent.js");
const Event = require("../../models/Event.model.js");
// const sendEventConfirmationMail = require("../../helpers/SendMail.js");

const getFilteredEvents = async (req, res) => {
  try {
    const {
      filter,
      startDate,
      endDate,
      search,
      category,
      isVirtual,
      status,
    } = req.query;

    console.log("🔍 Filter params received:", { filter, category, isVirtual, status });

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = {};

    /* ---------- SEARCH ---------- */
    if (search?.trim()) {
      query.title = { $regex: search, $options: "i" };
    }

    /* ---------- CATEGORY ---------- */
    if (category && category !== "all") {
      query.category = new RegExp(`^${category}$`, "i");
    }

    /* ---------- EVENT MODE (FIXED) ---------- */
    if (isVirtual !== undefined && isVirtual !== "all") {
      // Convert string to boolean properly
      if (isVirtual === "true" || isVirtual === true) {
        query.isVirtual = true;
        console.log("✅ Filtering for VIRTUAL events");
      } else if (isVirtual === "false" || isVirtual === false) {
        query.isVirtual = false;
        console.log("✅ Filtering for PHYSICAL events");
      }
    }

    /* ---------- STATUS ---------- */
    if (status && status !== "all") {
      query.status = status; // must match enum exactly
    }

    /* ---------- DATE FILTER ---------- */
    const dateQuery = {};

    // ADD THIS — handle "upcoming" and "all"
    if (filter === "upcoming") {
      dateQuery.$gte = today;
    }

    if (filter === "next7") {
      const next7 = new Date(today);
      next7.setDate(today.getDate() + 7);
      dateQuery.$gte = today;
      dateQuery.$lte = next7;
    }

    if (filter === "next30") {
      const next30 = new Date(today);
      next30.setDate(today.getDate() + 30);
      dateQuery.$gte = today;
      dateQuery.$lte = next30;
    }

    if (filter === "next60") {
      const next60 = new Date(today);
      next60.setDate(today.getDate() + 60);
      dateQuery.$gte = today;
      dateQuery.$lte = next60;
    }

    if (filter === "custom" && startDate && endDate) {
      dateQuery.$gte = new Date(startDate);
      dateQuery.$lte = new Date(endDate);
    }

    if (Object.keys(dateQuery).length) {
      query.date = dateQuery;
    }

    console.log("📊 Final MongoDB query:", JSON.stringify(query, null, 2));

    /* ---------- QUERY DB ---------- */
    const totalEvents = await Event.countDocuments(query);

    const events = await Event.find(query)
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    console.log(`✅ Found ${events.length} events out of ${totalEvents} total`);

    res.status(200).json({
      success: true,
      events,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      totalEvents,
    });
  } catch (err) {
    console.error("❌ Error in getFilteredEvents:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
};

const getEventDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const registerForEvent = async (req, res) => {
  try {
    console.log("📝 Registration request:", { eventId: req.params.eventId, body: req.body });

    const { eventId } = req.params;
    const { name, email } = req.body;

    if (!eventId || !email) {
      return res.status(400).json({
        message: "Event ID and email are required",
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        message: "Cannot register for a past event",
      });
    }

    const alreadyRegistered = await EventRegistration.findOne({
      eventId,
      email,
    });

    if (alreadyRegistered) {
      return res.status(409).json({
        message: "You have already registered for this event",
      });
    }

    const registration = await EventRegistration.create({
      eventId,
      name,
      email,
      registeredAt: new Date(),
    });

    try {
      await Event.findByIdAndUpdate(
        eventId,
        { $inc: { registrationsCount: 1 } }
      );
    } catch {
      await EventRegistration.findByIdAndDelete(registration._id);
      throw new Error("Failed to update registration count");
    }

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      registrationId: registration._id,
    });
  } catch (error) {
    console.error("Event registration failed:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ✅ Updated controller with pagination
const getMyRegisteredEvents = async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    let skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── Step 1: Get ALL registration records for this user (no pagination yet)
    // We need all of them so we can join with events and filter by date BEFORE paginating.
    // Paginating registrations first and then filtering events causes wrong page sizes and counts.
    const allRegistrations = await EventRegistration.find({ email }).sort({
      registeredAt: -1,
    });

    if (allRegistrations.length === 0) {
      return res.status(200).json({
        success: true,
        events: [],
        currentPage: 1,
        totalPages: 1,
        totalEvents: 0,
      });
    }

    // ── Step 2: Fetch only UPCOMING events from those registrations
    const allEventIds = allRegistrations.map((r) => r.eventId);

    const upcomingEvents = await Event.find({
      _id: { $in: allEventIds },
      date: { $gte: today }, // ← only upcoming events
    }).sort({ date: 1 }); // soonest first

    // ── Step 3: Enrich each upcoming event with registeredAt from the registration record
    const enriched = upcomingEvents.map((event) => {
      const reg = allRegistrations.find(
        (r) => r.eventId.toString() === event._id.toString()
      );
      return { ...event.toObject(), registeredAt: reg?.registeredAt };
    });

    // ── Step 4: NOW paginate the enriched upcoming list
    const totalUpcoming = enriched.length;
    const paginated = enriched.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      events: paginated,
      currentPage: page,
      totalPages: Math.ceil(totalUpcoming / limit) || 1,
      totalEvents: totalUpcoming,
    });
  } catch (err) {
    console.error("❌ getMyRegisteredEvents:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getEventPage = async (req, res) => {
  try {
    const { eventId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count how many events come before this one (same sort order as getFilteredEvents)
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const position = await Event.countDocuments({
      date: { $gte: today, $lt: event.date },
    });

    const page = Math.floor(position / limit) + 1;

    res.status(200).json({ success: true, page });
  } catch (err) {
    console.error("❌ getEventPage:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getFilteredEvents,
  getEventDetails,
  registerForEvent,
  getMyRegisteredEvents,
  getEventPage,

};


