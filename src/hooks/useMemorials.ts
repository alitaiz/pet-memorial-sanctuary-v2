import { useState, useCallback } from 'react';
import { Memorial } from '../types';
import { API_BASE_URL } from '../config';

const LOCAL_CREATED_SLUGS_KEY = 'pet_memorial_created_slugs';

// This hook now manages interactions with the remote API
export const useMemorials = () => {
  const [loading, setLoading] = useState<boolean>(false);

  // --- Local slugs management ---
  const getCreatedSlugs = useCallback((): string[] => {
    try {
      const storedSlugs = localStorage.getItem(LOCAL_CREATED_SLUGS_KEY);
      return storedSlugs ? JSON.parse(storedSlugs) : [];
    } catch {
      return [];
    }
  }, []);
  
  const addCreatedSlug = useCallback((slug: string) => {
    const slugs = getCreatedSlugs();
    if (!slugs.includes(slug)) {
      localStorage.setItem(LOCAL_CREATED_SLUGS_KEY, JSON.stringify([...slugs, slug]));
    }
  }, [getCreatedSlugs]);
  
  const removeCreatedSlug = useCallback((slug: string) => {
     const slugs = getCreatedSlugs();
     const updatedSlugs = slugs.filter(s => s !== slug);
     localStorage.setItem(LOCAL_CREATED_SLUGS_KEY, JSON.stringify(updatedSlugs));
  }, [getCreatedSlugs]);


  // --- API Functions ---
  const addMemorial = useCallback(async (newMemorial: Memorial): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/memorial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemorial),
      });

      if (response.ok) {
        addCreatedSlug(newMemorial.slug); // Keep track of created slugs locally
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || `Failed to create memorial. Status: ${response.status}` };
      }
    } catch (error) {
      console.error("API call to addMemorial failed:", error);
      return { success: false, error: "Network error. Please check your connection and try again." };
    } finally {
      setLoading(false);
    }
  }, [addCreatedSlug]);
  
  const getMemorialBySlug = useCallback(async (slug: string): Promise<Memorial | undefined> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/memorial/${slug}`);
      if (!response.ok) {
        return undefined;
      }
      const data: Memorial = await response.json();
      return data;
    } catch (error) {
      console.error("API call to getMemorialBySlug failed:", error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMemorial = useCallback((slug: string) => {
    removeCreatedSlug(slug);
  }, [removeCreatedSlug]);

  const generateSlug = useCallback((petName: string): string => {
    const baseSlug = petName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!baseSlug) {
        return `pet-${Date.now().toString().slice(-6)}`;
    }
    // The backend handles uniqueness, but we can add a little bit of randomness
    // to reduce collisions for very common names.
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }, []);

  return { 
    loading, 
    addMemorial, 
    getMemorialBySlug, 
    deleteMemorial, 
    generateSlug,
    getCreatedSlugs,
  };
};
