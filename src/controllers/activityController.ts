import { Request, Response, NextFunction } from "express";
import { Activity } from "../models/Activity";
import { logger } from "../utils/logger";
import { sendActivityCompletionEvent } from "../utils/inngestEvents";
import { startOfDay, endOfDay } from "date-fns";

// Valid activity types based on the schema
const VALID_ACTIVITY_TYPES = [
  "game", "mood", "therapy", "meditation", "breathing", 
  "exercise", "sleep", "nutrition", "social", "work", 
  "hobby", "other"
];

// Log a new activity
export const logActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { type, name, description, duration, difficulty, feedback } = req.body;
    const userId = req.user?._id;

    console.log("Received activity log request:", { type, name, userId });

    if (!userId) {
      console.error("No user ID found in request");
      return res.status(401).json({ 
        success: false,
        message: "User not authenticated" 
      });
    }

    // Validate required fields
    if (!type || !name) {
      console.error("Missing required fields:", { type, name });
      return res.status(400).json({
        success: false,
        message: "Type and name are required fields"
      });
    }

    // Validate activity type
    if (!VALID_ACTIVITY_TYPES.includes(type)) {
      console.error("Invalid activity type:", type);
      return res.status(400).json({
        success: false,
        message: `Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`,
        validTypes: VALID_ACTIVITY_TYPES
      });
    }

    // Set default values for optional fields
    const activityData = {
      userId,
      type: type,
      name: name.trim(),
      description: description ? description.trim() : null,
      duration: duration || 0,
      difficulty: difficulty || 1,
      feedback: feedback ? feedback.trim() : null,
      timestamp: new Date(),
    };

    console.log("Creating activity with data:", activityData);

    const activity = new Activity(activityData);

    await activity.save();
    logger.info(`Activity logged for user ${userId}: ${activityData.name}`);

    // Send activity completion event to Inngest (optional - don't block on this)
    try {
      await sendActivityCompletionEvent({
        userId,
        id: activity._id,
        type: activityData.type,
        name: activityData.name,
        duration: activityData.duration,
        difficulty: activityData.difficulty,
        feedback: activityData.feedback,
        timestamp: activity.timestamp,
      });
      logger.info("Inngest event sent successfully");
    } catch (inngestError) {
      logger.warn("Failed to send Inngest event:", inngestError);
      // Continue even if Inngest fails - this is not critical
    }

    console.log("Activity saved successfully:", activity._id);

    return res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error: any) {
    console.error("Error in logActivity controller:", error);
    logger.error("Error logging activity:", error);
    
    // Handle specific MongoDB validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Error logging activity",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get today's activities for the authenticated user
export const getTodayActivities = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const activities = await Activity.find({
      userId,
      timestamp: {
        $gte: todayStart,
        $lte: todayEnd
      }
    }).sort({ timestamp: -1 });

    console.log(`Found ${activities.length} activities for today`);
    return res.json(activities);
  } catch (error) {
    logger.error("Error fetching today's activities:", error);
    return res.status(500).json({ 
      message: "Error fetching activities",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get all activities for the user
export const getUserActivities = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const activities = await Activity.find({ userId }).sort({ timestamp: -1 });

    console.log(`Found ${activities.length} activities for user ${userId}`);
    return res.json(activities);
  } catch (error) {
    logger.error("Error fetching user activities:", error);
    return res.status(500).json({ 
      message: "Error fetching activities",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};