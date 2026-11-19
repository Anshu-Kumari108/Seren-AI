const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:3001";

export interface Activity {
  _id?: string;
  id?: string;
  userId: string | null;
  type: string;
  name: string;
  description: string | null;
  timestamp: Date;
  duration: number | null;
  difficulty: number | null;
  feedback: string | null;
  completed?: boolean;
  moodScore?: number | null;
  moodNote?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ActivityEntry {
  type: string;
  name: string;
  description?: string;
  duration?: number;
  difficulty?: number;
  feedback?: string;
  userId?: string;
}

// Helper function to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Helper function to handle API errors
const handleActivityError = async (response: Response, defaultMessage: string) => {
  if (!response.ok) {
    let errorMessage = defaultMessage;
    
    // Handle network errors (status 0)
    if (response.status === 0) {
      errorMessage = "Network error: Cannot connect to server. Please check if the backend is running on port 3001.";
      console.error("Activity API Network Error - Backend might be down");
      throw new Error(errorMessage);
    }
    
    try {
      const errorText = await response.text();
      console.error("Activity API Error Response Text:", errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        console.error("Failed to parse error response as JSON:", parseError);
        errorData = { error: errorText || 'Unknown error' };
      }
      
      // Use the backend error message if available
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors.join(', ');
      }
      
      // Handle specific error codes
      if (response.status === 400) {
        errorMessage = `Validation error: ${errorMessage}`;
      } else if (response.status === 401) {
        errorMessage = "Please log in again.";
      } else if (response.status === 404) {
        errorMessage = "Activity endpoint not found. Please check the backend routes.";
      } else if (response.status === 500) {
        errorMessage = "Server error. Please try again later.";
      }
    } catch (parseError) {
      console.error("Error parsing error response:", parseError);
      errorMessage = response.statusText || defaultMessage;
    }
    
    console.error("Activity API Error Details:", {
      status: response.status,
      message: errorMessage,
      url: response.url
    });
    
    throw new Error(errorMessage);
  }
};

export async function logActivity(
  data: ActivityEntry
): Promise<{ success: boolean; data: Activity }> {
  try {
    console.log("Logging activity to backend:", data);
    
    const response = await fetch(`${API_BASE}/api/activity`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    console.log("Activity API Response status:", response.status);
    
    await handleActivityError(response, "Failed to log activity");

    const result = await response.json();
    console.log("Activity logged successfully:", result);
    return result;
  } catch (error) {
    console.error("Error in logActivity function:", error);
    throw error;
  }
}

export async function getTodayActivities(): Promise<Activity[]> {
  try {
    console.log("Fetching today's activities...");
    const response = await fetch(`${API_BASE}/api/activity/today`, {
      headers: getAuthHeaders(),
    });

    await handleActivityError(response, "Failed to fetch today's activities");

    const activities = await response.json();
    console.log("Received today's activities:", activities.length, "items");
    return activities;
  } catch (error) {
    console.error("Error fetching today's activities:", error);
    throw error;
  }
}

export async function getUserActivities(userId?: string): Promise<Activity[]> {
  try {
    const url = userId 
      ? `${API_BASE}/api/activity?userId=${userId}`
      : `${API_BASE}/api/activity`;

    console.log("Fetching user activities from:", url);
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    await handleActivityError(response, "Failed to fetch user activities");

    const activities = await response.json();
    console.log("Received user activities:", activities.length, "items");
    return activities;
  } catch (error) {
    console.error("Error fetching user activities:", error);
    throw error;
  }
}