import { useState, useEffect } from 'react';
import { ProjectMeta, SavedProject, SvgNodeInfo, SmartObject, JsonDataRow } from '../types';
import * as htmlToImage from 'html-to-image';

export const useProjectSystem = () => {
  const [recentProjects, setRecentProjects] = useState<ProjectMeta[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("Untitled Project");

  // Load index on mount
  useEffect(() => {
    const indexStr = localStorage.getItem('kaadogen_index');
    if (indexStr) {
        try {
            setRecentProjects(JSON.parse(indexStr));
        } catch(e) { console.error("Failed to parse project index"); }
    }
  }, []);

  const saveProject = async (
    svgContent: string | null,
    smartObjects: Record<string, SmartObject>,
    jsonData: JsonDataRow[],
    nodes: SvgNodeInfo[],
    nodeMap: Record<string, SvgNodeInfo>,
    pan: { x: number, y: number },
    scale: number,
    contentElement: HTMLElement | null,
    selectedId: string | null
  ) => {
      const id = currentProjectId || crypto.randomUUID();
      
      // Generate Thumbnail
      let thumbnail = undefined;
      if (contentElement && svgContent) {
          try {
              // Capture a small snapshot for the thumbnail
              // Temporarily hide selection outline
              const prevSelected = contentElement.querySelectorAll('.outline-selected');
              prevSelected.forEach(el => el.classList.remove('outline-selected'));
              
              const blob = await htmlToImage.toPng(contentElement, { 
                  width: 320, 
                  height: 180, 
                  pixelRatio: 1,
                  style: { transform: 'none' } // Capture unscaled
              });
              thumbnail = blob;
              
              // Restore selection
              if (selectedId) {
                  const el = contentElement.querySelector(`[id='${selectedId}']`);
                  if (el) el.classList.add('outline-selected');
              }
          } catch (e) { console.warn("Thumbnail gen failed", e); }
      }

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
          scale
      };

      // Save project data
      localStorage.setItem(`kaadogen_project_${id}`, JSON.stringify(projectData));

      // Update Index
      const newMeta: ProjectMeta = { id, name: projectName, lastModified: Date.now(), thumbnail };
      const existingIndex = recentProjects.filter(p => p.id !== id);
      const newIndex = [newMeta, ...existingIndex];
      
      setRecentProjects(newIndex);
      localStorage.setItem('kaadogen_index', JSON.stringify(newIndex));
      setCurrentProjectId(id);
      
      return id;
  };

  const loadProject = (id: string): SavedProject | null => {
      const dataStr = localStorage.getItem(`kaadogen_project_${id}`);
      if (dataStr) {
          try {
              const data: SavedProject = JSON.parse(dataStr);
              setCurrentProjectId(data.id);
              setProjectName(data.name);
              return data;
          } catch(e) { 
            console.error("Failed to load project", e); 
            return null;
          }
      }
      return null;
  };

  const deleteProject = (id: string) => {
      localStorage.removeItem(`kaadogen_project_${id}`);
      const newIndex = recentProjects.filter(p => p.id !== id);
      setRecentProjects(newIndex);
      localStorage.setItem('kaadogen_index', JSON.stringify(newIndex));
      if (currentProjectId === id) {
          setCurrentProjectId(null);
          setProjectName("Untitled Project");
      }
  };

  const createNewProject = () => {
      setCurrentProjectId(null);
      setProjectName("Untitled Project");
  };

  return {
    recentProjects,
    currentProjectId,
    setCurrentProjectId,
    projectName,
    setProjectName,
    saveProject,
    loadProject,
    deleteProject,
    createNewProject
  };
};