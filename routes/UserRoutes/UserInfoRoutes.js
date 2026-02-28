    const express = require("express");
    const router = express.Router();
    const { upload } = require("../../helpers/Cloudinary");
    const { authMiddleware } = require("../../controllers/auth/authController");
    const { getMyProfile, upsertProfile, uploadProfileImage, getUserProfile, handleProfileImageUpload, createOrUpdateUserProfile, deleteUserProfile, getAllUserProfiles } = require("../../controllers/user/UserInfoController");

    router.use(authMiddleware)

    // Image upload route
    router.post("/upload-image", upload.single("my_file"), handleProfileImageUpload);

    // Get single user profile
    router.get("/get", getUserProfile);

    // Create or update user profile
    router.put("/update", createOrUpdateUserProfile);

    // Delete user profile
    router.delete("/delete", deleteUserProfile);

    // Get all user profiles (admin)
    router.get("/get-all", getAllUserProfiles);


    module.exports = router;
