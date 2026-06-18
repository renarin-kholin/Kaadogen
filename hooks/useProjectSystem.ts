import { useState, useEffect, useCallback } from 'react';
import { ProjectMeta, SavedProject, SvgNodeInfo, SmartObject, JsonDataRow } from '../types';
import * as htmlToImage from 'html-to-image';
import * as db from '../utils/db';
import { toast } from '../utils/toast';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const useProjectSystem = () => {
  const [recentProjects, setRecentProjects] = useState<ProjectMeta[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('Untitled Project');
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const refreshIndex = useCallback(async () => {
    try {
      const metas = await db.getAllProjectMeta();
      setRecentProjects(metas);
    } catch (e) {
      console.error('Failed to load project index', e);
      toast('Could not load your saved projects.', 'error');
    }
  }, []);

  // Migrate any legacy localStorage projects, then load the index.
  useEffect(() => {
    (async () => {
      try {
        const migrated = await db.migrateFromLocalStorage();
        if (migrated > 0) {
          toast(`Imported ${migrated} project${migrated === 1 ? '' : 's'} from local storage.`, 'info');
        }
      } catch (e) {
        console.warn('Migration check failed', e);
      }
      await refreshIndex();
      setIsLoadingProjects(false);
    })();
  }, [refreshIndex]);

  const generateThumbnail = async (
    contentElement: HTMLElement | null,
    svgContent: string | null,
    selectedId: string | null,
  ): Promise<string | undefined> => {
    if (!contentElement || !svgContent) return undefined;
    try {
      const prevSelected = contentElement.querySelectorAll('.outline-selected');
      prevSelected.forEach((el) => el.classList.remove('outline-selected'));
      const blob = await htmlToImage.toPng(contentElement, {
        width: 320,
        height: 180,
        pixelRatio: 1,
        style: { transform: 'none' },
      });
      if (selectedId) {
        const el = contentElement.querySelector(`[id='${selectedId}']`);
        if (el) el.classList.add('outline-selected');
      }
      return blob;
    } catch (e) {
      console.warn('Thumbnail generation failed', e);
      return undefined;
    }
  };

  const saveProject = async (
    svgContent: string | null,
    smartObjects: Record<string, SmartObject>,
    jsonData: JsonDataRow[],
    nodes: SvgNodeInfo[],
    nodeMap: Record<string, SvgNodeInfo>,
    pan: { x: number; y: number },
    scale: number,
    contentElement: HTMLElement | null,
    selectedId: string | null,
  ): Promise<string | null> => {
    setSaveStatus('saving');
    const id = currentProjectId || crypto.randomUUID();
    const thumbnail = await generateThumbnail(contentElement, svgContent, selectedId);

    const projectData: SavedProject = {
      id,
      name: projectName,
      lastModified: Date.now(),
      thumbnail,
      svgContent,
      smartObjects,
      jsonData,
      nodes,
      nodeMap,
      pan,
      scale,
    };

    try {
      await db.putProject(projectData);
      setCurrentProjectId(id);
      setSaveStatus('saved');
      setLastSavedAt(projectData.lastModified);
      await refreshIndex();
      return id;
    } catch (e) {
      console.error('Failed to save project', e);
      setSaveStatus('error');
      toast('Failed to save project. Your browser storage may be full or blocked.', 'error');
      return null;
    }
  };

  const loadProject = async (id: string): Promise<SavedProject | null> => {
    try {
      const data = await db.getProject(id);
      if (data) {
        setCurrentProjectId(data.id);
        setProjectName(data.name);
        setSaveStatus('saved');
        setLastSavedAt(data.lastModified);
        return data;
      }
      toast('That project could not be found.', 'error');
      return null;
    } catch (e) {
      console.error('Failed to load project', e);
      toast('Failed to open project.', 'error');
      return null;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await db.deleteProject(id);
      await refreshIndex();
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setProjectName('Untitled Project');
        setSaveStatus('idle');
      }
      toast('Project deleted.', 'info');
    } catch (e) {
      console.error('Failed to delete project', e);
      toast('Failed to delete project.', 'error');
    }
  };

  const renameProject = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const data = await db.getProject(id);
      if (!data) return;
      await db.putProject({ ...data, name: trimmed, lastModified: Date.now() });
      if (currentProjectId === id) setProjectName(trimmed);
      await refreshIndex();
    } catch (e) {
      console.error('Failed to rename project', e);
      toast('Failed to rename project.', 'error');
    }
  };

  const duplicateProject = async (id: string) => {
    try {
      const data = await db.getProject(id);
      if (!data) return;
      const copy: SavedProject = {
        ...data,
        id: crypto.randomUUID(),
        name: `${data.name} (copy)`,
        lastModified: Date.now(),
      };
      await db.putProject(copy);
      await refreshIndex();
      toast('Project duplicated.', 'success');
    } catch (e) {
      console.error('Failed to duplicate project', e);
      toast('Failed to duplicate project.', 'error');
    }
  };

  const createNewProject = () => {
    setCurrentProjectId(null);
    setProjectName('Untitled Project');
    setSaveStatus('idle');
    setLastSavedAt(null);
  };

  return {
    recentProjects,
    isLoadingProjects,
    currentProjectId,
    setCurrentProjectId,
    projectName,
    setProjectName,
    saveStatus,
    setSaveStatus,
    lastSavedAt,
    saveProject,
    loadProject,
    deleteProject,
    renameProject,
    duplicateProject,
    createNewProject,
  };
};
