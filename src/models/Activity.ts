import mongoose, { Schema, Document } from "mongoose";

export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  name: string;
  description?: string;
  timestamp: Date;
  duration?: number;
  difficulty?: number;
  feedback?: string;
  completed?: boolean;
  moodScore?: number;
  moodNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "game", // Add this line
        "mood",
        "therapy", 
        "meditation",
        "breathing",
        "exercise",
        "sleep",
        "nutrition",
        "social",
        "work",
        "hobby",
        "other"
      ],
      default: "other",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    duration: {
      type: Number, // in minutes
      min: 0,
    },
    difficulty: {
      type: Number,
      min: 1,
      max: 10,
      default: 1,
    },
    feedback: {
      type: String,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: true,
    },
    moodScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    moodNote: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add index for better query performance
activitySchema.index({ userId: 1, timestamp: -1 });
activitySchema.index({ userId: 1, type: 1 });

export const Activity = mongoose.model<IActivity>("Activity", activitySchema);