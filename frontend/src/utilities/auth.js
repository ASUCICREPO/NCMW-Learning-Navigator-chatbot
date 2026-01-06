// Authentication utility functions
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Retrieves the ID token from AWS Amplify Auth session
 * @returns {Promise<string>} The ID token string
 */
export async function getIdToken() {
  try {
    // Check if in guest mode first
    const guestMode = localStorage.getItem("guestMode");
    if (guestMode === "true") {
      return "guest-demo-token";
    }

    // Try to get token from localStorage (for regular login)
    const token = localStorage.getItem("idToken");
    if (token && token !== "guest-demo-token") {
      return token;
    }

    // If not found, try to fetch from Amplify session
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (idToken) {
      localStorage.setItem("idToken", idToken);
      return idToken;
    }

    throw new Error("No valid authentication token found");
  } catch (error) {
    console.error("Error getting ID token:", error);
    throw error;
  }
}

/**
 * Retrieves the access token from AWS Amplify Auth session
 * @returns {Promise<string>} The access token string
 */
export async function getAccessToken() {
  try {
    // Check if in guest mode first
    const guestMode = localStorage.getItem("guestMode");
    if (guestMode === "true") {
      return "guest-demo-token";
    }

    // Try to get token from localStorage (for regular login)
    const token = localStorage.getItem("accessToken");
    if (token && token !== "guest-demo-token") {
      return token;
    }

    // If not found, try to fetch from Amplify session
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
      return accessToken;
    }

    throw new Error("No valid authentication token found");
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
}

/**
 * Checks if the user is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
export function isAuthenticated() {
  const guestMode = localStorage.getItem("guestMode");
  const idToken = localStorage.getItem("idToken");
  return guestMode === "true" || !!idToken;
}

/**
 * Clears authentication data from localStorage
 */
export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("idToken");
  localStorage.removeItem("guestMode");
}
