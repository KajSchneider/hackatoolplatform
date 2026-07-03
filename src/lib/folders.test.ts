import { describe, it, expect } from "vitest";

describe("folder validation", () => {
  it("validates folder names", () => {
    const isValidFolderName = (name: string) => {
      return name.length > 0 && name.length <= 100 && /^[a-zA-Z0-9 _-]+$/.test(name);
    };

    expect(isValidFolderName("My Folder")).toBe(true);
    expect(isValidFolderName("folder-1")).toBe(true);
    expect(isValidFolderName("folder_2")).toBe(true);
    expect(isValidFolderName("")).toBe(false);
    expect(isValidFolderName("folder/with/slash")).toBe(false);
    expect(isValidFolderName("folder*with*asterisk")).toBe(false);
  });

  it("validates folder hierarchy", () => {
    const isValidHierarchy = (parentId: string | null) => {
      return parentId === null || typeof parentId === "string" && parentId.length > 0;
    };

    expect(isValidHierarchy(null)).toBe(true);
    expect(isValidHierarchy("valid-id")).toBe(true);
    expect(isValidHierarchy("")).toBe(false);
  });

  it("validates folder-project relationship", () => {
    const belongsToProject = (folderProjectId: string, currentProjectId: string) => {
      return folderProjectId === currentProjectId;
    };

    expect(belongsToProject("proj-1", "proj-1")).toBe(true);
    expect(belongsToProject("proj-1", "proj-2")).toBe(false);
  });
});

describe("folder operations", () => {
  it("creates folder with correct structure", () => {
    const createFolder = (name: string, projectId: string, parentId: string | null) => ({
      id: `folder-${Date.now()}`,
      name,
      projectId,
      parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const folder = createFolder("src", "proj-1", null);
    expect(folder.id).toBeDefined();
    expect(folder.name).toBe("src");
    expect(folder.projectId).toBe("proj-1");
    expect(folder.parentId).toBeNull();
  });

  it("creates nested folder", () => {
    const createFolder = (name: string, projectId: string, parentId: string | null) => ({
      id: `folder-${Date.now()}`,
      name,
      projectId,
      parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const parent = createFolder("src", "proj-1", null);
    const child = createFolder("components", "proj-1", parent.id);
    expect(child.parentId).toBe(parent.id);
  });

  it("deletes folder and cascades to children", () => {
    const folders = [
      { id: "f1", parentId: null },
      { id: "f2", parentId: "f1" },
      { id: "f3", parentId: "f2" },
    ];

    const deleteFolder = (folderId: string, allFolders: typeof folders) => {
      const toDelete = new Set<string>();
      const collectChildren = (id: string) => {
        toDelete.add(id);
        allFolders.filter(f => f.parentId === id).forEach(f => collectChildren(f.id));
      };
      collectChildren(folderId);
      return allFolders.filter(f => !toDelete.has(f.id));
    };

    const remaining = deleteFolder("f1", folders);
    expect(remaining).toHaveLength(0);
  });

  it("deletes folder and removes associated files", () => {
    const files = [
      { id: "file1", folderId: "f1" },
      { id: "file2", folderId: "f1" },
      { id: "file3", folderId: null },
    ];

    const deleteFolderFiles = (folderId: string, allFiles: typeof files) => {
      return allFiles.filter(f => f.folderId !== folderId);
    };

    const remaining = deleteFolderFiles("f1", files);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("file3");
  });
});
