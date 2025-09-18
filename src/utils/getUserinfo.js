import { useState, useEffect } from 'react';
import {apiUrl} from "./apiUrl";

export const useGetUserInfo = (ludo4Token) => {
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate API delay
    const timer = setTimeout(() => { 
      const dummyUserData = {
        session: "dummy_session_123",
        username: "TestUser",
        balance: 1000,
        id: "dummy_chat_id",
        chatId: "dummy_chat_id",
      };
      
      console.log("Using dummy user data:", dummyUserData);
      setUserInfo(dummyUserData);
      setIsLoading(false);
    }, 500); // Small delay to simulate network request

    return () => clearTimeout(timer);
  }, [ludo4Token]);

  return { userInfo, isLoading, error };
};
