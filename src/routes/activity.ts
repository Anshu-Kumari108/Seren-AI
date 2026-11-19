import express from "express";
import { 
  logActivity, 
  getTodayActivities,
  getUserActivities 
} from "../controllers/activityController";
import { auth } from "../middleware/auth";

const router = express.Router();

// All routes are protected with authentication
router.use(auth);

// Log a new activity
router.post("/", logActivity);

// Get today's activities for the authenticated user
router.get("/today", getTodayActivities);

// Get all activities for the user
router.get("/", getUserActivities);

export default router;