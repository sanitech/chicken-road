import { useState, useEffect } from 'react';
import {apiUrl} from "./apiUrl";

export const useGetUserInfo = (chickenToken) => {
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!chickenToken) {
        console.log("No token provided");
        setError("Authentication token required");
        setIsLoading(false);
        return;
      }

      try {
        console.log("Fetching user info with token:", chickenToken.substring(0, 20) + "...");
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${apiUrl}/api/userinfo/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${chickenToken}`
          }
        });

        console.log("API Response status:", response.status);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Invalid authentication token");
          } else if (response.status === 404) {
            throw new Error("User not found");
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        }

        const userData = await response.json();
        console.log("User data received:", userData);

        // Only use real data from backend - no dummy data
        const transformedUserData = {
          session: chickenToken,
          username: userData.username,
          balance: userData.balance,
          id: userData.chatId,
          chatId: userData.chatId,
          phoneNumber: userData.phoneNumber,
          verified: userData.verified,
          bonus: userData.bonus
        };

        setUserInfo(transformedUserData);
        setIsLoading(false);

      } catch (err) {
        console.error('Error fetching user info:', err);
        setError(err.message);
        setIsLoading(false);
        setUserInfo(null); // Clear any existing user info on error
      }
    };

    fetchUserInfo();
  }, [chickenToken]);

  return { userInfo, isLoading, error };
};