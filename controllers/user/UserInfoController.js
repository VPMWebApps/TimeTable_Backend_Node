const { handleImageUploadUtil } = require("../../helpers/Cloudinary");
const UserInfo = require("../../models/UserInfo.model");
const { User } = require("../../models/user.model");

/* ===============================
   PROFILE IMAGE UPLOAD
=============================== */
exports.handleProfileImageUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const result = await handleImageUploadUtil(
      req.file.buffer,
      req.file.mimetype
    );

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error occurred during upload",
      error: error.message,
    });
  }
};

/* ===============================
   GET USER PROFILE
=============================== */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("fullname email batch stream").lean();

    // const user = await User.findById(userId).select(
    //   "fullname email batch stream"
    // );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userInfo = await UserInfo.findOne({ user: userId }).lean(); // add .lean()
    // const userInfo = await UserInfo.findOne({ user: userId });


    const profile = {
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        batch: user.batch,
        stream: user.stream,
      },
      jobTitle: userInfo?.jobTitle || "",
      company: userInfo?.company || "",
      industry: userInfo?.industry || "",
      about: userInfo?.about || "",
      linkedin: userInfo?.linkedin || "",
      profilePicture: userInfo?.profilePicture || "",
    };

    return res.status(200).json({
      success: true,
      data: profile,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
};


/* ===============================
   CREATE/UPDATE USER PROFILE
=============================== */
exports.createOrUpdateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;



    const {
      jobTitle,
      company,
      industry,
      about,
      linkedin,
      profilePicture,
    } = req.body;



    let userProfile = await UserInfo.findOne({ user: userId });

    if (userProfile) {
      userProfile.jobTitle = jobTitle ?? userProfile.jobTitle;
      userProfile.company = company ?? userProfile.company;
      userProfile.industry = industry ?? userProfile.industry;
      userProfile.about = about ?? userProfile.about;
      userProfile.linkedin = linkedin ?? userProfile.linkedin;
      userProfile.profilePicture =
        profilePicture ?? userProfile.profilePicture;

      await userProfile.save();
    } else {
      userProfile = await UserInfo.create({
        user: userId,
        jobTitle: jobTitle || "",
        company: company || "",
        industry: industry || "",
        about: about || "",
        linkedin: linkedin || "",
        profilePicture: profilePicture || "",
      });
    }

    // 🔥 ALWAYS rebuild response like GET endpoint
    const user = await User.findById(userId).select(
      "fullname email batch stream"
    );

    const profile = {
      user: {
        _id: user._id,
        fullname: user.fullname,
        email: user.email,
        batch: user.batch,
        stream: user.stream,
      },
      jobTitle: userProfile.jobTitle || "",
      company: userProfile.company || "",
      industry: userProfile.industry || "",
      about: userProfile.about || "",
      linkedin: userProfile.linkedin || "",
      profilePicture: userProfile.profilePicture || "",
    };

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully",
      data: profile,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error occurred while saving profile",
    });
  }
};


/* ===============================
   DELETE USER PROFILE
=============================== */
exports.deleteUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const userProfile = await UserInfo.findOneAndDelete({ user: userId });

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error occurred while deleting profile",
    });
  }
};


/* ===============================
   GET ALL USER PROFILES (ADMIN)
=============================== */
exports.getAllUserProfiles = async (req, res) => {
  try {
    const userProfiles = await UserInfo.find({})
      .populate("user", "fullname email phoneno batch stream")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: userProfiles.length,
      data: userProfiles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error occurred while fetching user profiles",
    });
  }
};