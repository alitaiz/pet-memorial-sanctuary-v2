
import { useState, useCallback } from 'react';
import { Memorial, CreatedMemorialInfo, MemorialUpdatePayload, MemorialSummary } from '../types';
import { API_BASE_URL } from '../config';

const LOCAL_CREATED_MEMORIALS_KEY = 'pet_memorial_created_memorials';
const LOCAL_VISITED_SLUGS_KEY = 'pet_memorial_visited_slugs';

// This hook now manages interactions with the remote API and local storage for ownership/access
export const useMemorials = () => {
  const [loading, setLoading] = useState<boolean>(false);

  // --- Local storage management for OWNED memorials ---
  const getCreatedMemorials = useCallback((): CreatedMemorialInfo[] => {
    try {
      const stored = localStorage.getItem(LOCAL_CREATED_MEMORIALS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);
  
  const addCreatedMemorial = useCallback((slug: string, editKey: string) => {
    const created = getCreatedMemorials();
    if (!created.some(m => m.slug === slug)) {
      const newCreated = [...created, { slug, editKey }];
      localStorage.setItem(LOCAL_CREATED_MEMORIALS_KEY, JSON.stringify(newCreated));
    }
  }, [getCreatedMemorials]);
  
  const removeCreatedMemorial = useCallback((slug: string) => {
     const created = getCreatedMemorials();
     const updated = created.filter(m => m.slug !== slug);
     localStorage.setItem(LOCAL_CREATED_MEMORIALS_KEY, JSON.stringify(updated));
  }, [getCreatedMemorials]);

  // --- Local storage management for VISITED memorials ---
  const getVisitedSlugs = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(LOCAL_VISITED_SLUGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const addVisitedSlug = useCallback((slug: string) => {
    const created = getCreatedMemorials();
    if (created.some(m => m.slug === slug)) return; // Don't add if we own it

    const visited = getVisitedSlugs();
    if (!visited.includes(slug)) {
      localStorage.setItem(LOCAL_VISITED_SLUGS_KEY, JSON.stringify([...visited, slug]));
    }
  }, [getCreatedMemorials, getVisitedSlugs]);

  const removeVisitedSlug = useCallback((slug: string) => {
    const visited = getVisitedSlugs();
    const updated = visited.filter(s => s !== slug);
    localStorage.setItem(LOCAL_VISITED_SLUGS_KEY, JSON.stringify(updated));
  }, [getVisitedSlugs]);

  // --- Combined slugs ---
  const getAllSlugs = useCallback((): string[] => {
    const created = getCreatedMemorials().map(m => m.slug);
    const visited = getVisitedSlugs();
    return [...new Set([...created, ...visited])]; // Unique slugs
  }, [getCreatedMemorials, getVisitedSlugs]);


  // --- API Functions ---
  const generateSlug = useCallback((petName: string): string => {
    const baseSlug = petName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!baseSlug) {
        return `pet-${Date.now().toString().slice(-6)}`;
    }
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }, []);

  const addMemorial = useCallback(async (memorialData: { petName: string; shortMessage: string; memorialContent: string; images: string[]; slug?: string; }): Promise<{ success: boolean; error?: string, slug?: string, editKey?: string }> => {
    setLoading(true);
    try {
      const { petName, shortMessage, memorialContent, images, slug } = memorialData;
      // Generate slug and editKey here
      const finalSlug = slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || generateSlug(petName);
      const editKey = crypto.randomUUID();

      const newMemorial: Memorial = {
        petName,
        shortMessage,
        memorialContent,
        images,
        slug: finalSlug,
        createdAt: new Date().toISOString(),
        editKey,
      };

      const response = await fetch(`${API_BASE_URL}/api/memorial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemorial),
      });

      if (response.ok) {
        addCreatedMemorial(newMemorial.slug, newMemorial.editKey);
        return { success: true, slug: newMemorial.slug, editKey: newMemorial.editKey };
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
  }, [addCreatedMemorial, generateSlug]);
  
  const getMemorialBySlug = useCallback(async (slug: string): Promise<Omit<Memorial, 'editKey'> | undefined> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/memorial/${slug}`);
      if (!response.ok) {
        return undefined;
      }
      const data: Omit<Memorial, 'editKey'> = await response.json();
      addVisitedSlug(slug); // Add to visited list on successful fetch
      return data;
    } catch (error) {
      console.error("API call to getMemorialBySlug failed:", error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [addVisitedSlug]);

  const getMemorialSummaries = useCallback(async (slugs: string[]): Promise<MemorialSummary[]> => {
    if (slugs.length === 0) {
        return [];
    }
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/memorials/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slugs }),
        });

        if (!response.ok) {
            console.error("API call to getMemorialSummaries failed:", response.statusText);
            return [];
        }
        
        const data: MemorialSummary[] = await response.json();
        return data;
    } catch (error) {
        console.error("Network error during getMemorialSummaries:", error);
        return [];
    } finally {
        setLoading(false);
    }
  }, []);

  const deleteMemorial = useCallback(async (slug: string, editKey: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/memorial/${slug}`, {
        method: 'DELETE',
        headers: {
            'X-Edit-Key': editKey,
        }
      });

      if (response.ok) {
        removeCreatedMemorial(slug);
        removeVisitedSlug(slug); // Also remove from visited if it's there
        return { success: true };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `Failed to delete. Server responded with ${response.status}` };
    } catch (error) {
      console.error("API call to deleteMemorial failed:", error);
      return { success: false, error: "Network error during deletion. Please check your connection." };
    } finally {
      setLoading(false);
    }
  }, [removeCreatedMemorial, removeVisitedSlug]);
  
  const updateMemorial = useCallback(async (slug: string, editKey: string, data: MemorialUpdatePayload): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/memorial/${slug}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Edit-Key': editKey,
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            return { success: true };
        }
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `Failed to update. Server responded with ${response.status}` };
    } catch (error) {
        console.error("API call to updateMemorial failed:", error);
        return { success: false, error: "Network error during update. Please check your connection." };
    } finally {
        setLoading(false);
    }
  }, []);

  return { 
    loading, 
    addMemorial, 
    getMemorialBySlug,
    getMemorialSummaries,
    deleteMemorial,
    updateMemorial,
    generateSlug,
    getAllSlugs,
    getCreatedMemorials,
    removeVisitedSlug,
  };
};
