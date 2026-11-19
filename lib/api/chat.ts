export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    technique: string;
    goal: string;
    progress: any[];
    analysis?: {
      emotionalState: string;
      themes: string[];
      riskLevel: number;
      recommendedApproach: string;
      progressIndicators: string[];
    };
  };
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse {
  message: string;
  response?: string;
  analysis?: {
    emotionalState: string;
    themes: string[];
    riskLevel: number;
    recommendedApproach: string;
    progressIndicators: string[];
  };
  metadata?: {
    technique: string;
    goal: string;
    progress: any[];
  };
}

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  "http://localhost:3001";

// Helper function to get auth headers - FIXED VERSION
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

// Helper function to handle API errors - IMPROVED VERSION
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = "An error occurred";
    
    // Handle network errors (status 0) - backend not running
    if (response.status === 0) {
      errorMessage = "Network error: Cannot connect to server. Please check if the backend is running on port 3001.";
      console.error("Network Error - Backend might be down or CORS issue");
      throw new Error(errorMessage);
    }
    
    // Handle 404 specifically - route doesn't exist
    if (response.status === 404) {
      errorMessage = "Backend route not found. The server might be missing this endpoint.";
      console.error("404 Error - Backend route missing:", response.url);
      throw new Error(errorMessage);
    }
    
    try {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Unknown error' };
      }
      
      errorMessage = errorData.error || errorData.message || `HTTP error ${response.status}`;
      
      // Handle specific error codes
      if (response.status === 429) {
        errorMessage = "AI service is busy. Please try again in a moment.";
      } else if (response.status === 401) {
        errorMessage = "Please log in again.";
      }
    } catch (parseError) {
      errorMessage = `Network error: ${response.status}`;
    }
    
    console.error("API Error:", {
      status: response.status,
      message: errorMessage,
      url: response.url
    });
    
    throw new Error(errorMessage);
  }
};

export const createChatSession = async (): Promise<string> => {
  try {
    console.log("Creating new chat session...");
    const response = await fetch(`${API_BASE}/chat/sessions`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    await handleApiError(response);

    const data = await response.json();
    console.log("Chat session created:", data);
    return data.sessionId;
  } catch (error) {
    console.error("Error creating chat session:", error);
    throw error;
  }
};

export const sendChatMessage = async (
  sessionId: string,
  message: string
): Promise<ApiResponse> => {
  try {
    console.log(`Sending message to session ${sessionId}:`, message);
    const response = await fetch(
      `${API_BASE}/chat/sessions/${sessionId}/messages`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message }),
      }
    );

    await handleApiError(response);

    const data = await response.json();
    console.log("Message sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw error;
  }
};

export const getChatHistory = async (
  sessionId: string
): Promise<ChatMessage[]> => {
  try {
    console.log(`Fetching chat history for session ${sessionId}`);
    const response = await fetch(
      `${API_BASE}/chat/sessions/${sessionId}/history`,
      {
        headers: getAuthHeaders(),
      }
    );

    await handleApiError(response);

    const data = await response.json();
    console.log("Received chat history:", data);

    // Handle both array response and object with messages property
    let messages = data;
    if (data && typeof data === 'object' && !Array.isArray(data) && data.messages) {
      messages = data.messages;
    }

    if (!Array.isArray(messages)) {
      console.error("Invalid chat history format:", data);
      throw new Error("Invalid chat history format");
    }

    // Ensure each message has the correct format
    return messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      metadata: msg.metadata,
    }));
  } catch (error) {
    console.error("Error fetching chat history:", error);
    throw error;
  }
};

export const getAllChatSessions = async (): Promise<ChatSession[]> => {
  try {
    console.log("Fetching all chat sessions...");
    const response = await fetch(`${API_BASE}/chat/sessions`, {
      headers: getAuthHeaders(),
    });

    await handleApiError(response);

    const data = await response.json();
    console.log("Received chat sessions:", data);

    // Handle both array response and object with sessions property
    let sessions = data;
    if (data && typeof data === 'object' && !Array.isArray(data) && data.sessions) {
      sessions = data.sessions;
    }

    if (!Array.isArray(sessions)) {
      console.log("No chat sessions found or empty response, returning empty array");
      return [];
    }

    return sessions.map((session: any) => {
      // Ensure dates are valid
      const createdAt = new Date(session.createdAt || session.startTime || Date.now());
      const updatedAt = new Date(session.updatedAt || Date.now());

      return {
        sessionId: session.sessionId || session._id,
        messages: (session.messages || []).map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp || Date.now()),
          metadata: msg.metadata,
        })),
        createdAt: isNaN(createdAt.getTime()) ? new Date() : createdAt,
        updatedAt: isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
      };
    });
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    // Return empty array instead of throwing error for better UX
    return [];
  }
};

export const getChatSession = async (sessionId: string): Promise<ChatSession> => {
  try {
    console.log(`Fetching chat session: ${sessionId}`);
    const response = await fetch(
      `${API_BASE}/chat/sessions/${sessionId}`,
      {
        headers: getAuthHeaders(),
      }
    );

    await handleApiError(response);

    const session = await response.json();
    console.log("Received chat session:", session);

    // Ensure dates are valid
    const createdAt = new Date(session.createdAt || session.startTime || Date.now());
    const updatedAt = new Date(session.updatedAt || Date.now());

    return {
      sessionId: session.sessionId || session._id,
      messages: (session.messages || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now()),
        metadata: msg.metadata,
      })),
      createdAt: isNaN(createdAt.getTime()) ? new Date() : createdAt,
      updatedAt: isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
    };
  } catch (error) {
    console.error("Error fetching chat session:", error);
    throw error;
  }
};