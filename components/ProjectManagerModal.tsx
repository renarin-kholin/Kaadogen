import React, { useMemo, useState } from "react";
import { ProjectMeta } from "../types";
import {
	PlusIcon,
	TrashIcon,
	FrameIcon,
	GithubIcon,
	CopyIcon,
	SearchIcon,
	EditIcon,
} from "./Icons";

interface ProjectManagerModalProps {
	isOpen: boolean;
	projects: ProjectMeta[];
	isLoading: boolean;
	onOpenProject: (id: string) => void;
	onNewProject: () => void;
	onDeleteProject: (id: string) => void;
	onRenameProject: (id: string, name: string) => void;
	onDuplicateProject: (id: string) => void;
}

type SortKey = "recent" | "name";

const relativeTime = (ts: number): string => {
	const diff = Date.now() - ts;
	const min = 60 * 1000;
	const hour = 60 * min;
	const day = 24 * hour;
	if (diff < min) return "just now";
	if (diff < hour) return `${Math.floor(diff / min)}m ago`;
	if (diff < day) return `${Math.floor(diff / hour)}h ago`;
	if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
	return new Date(ts).toLocaleDateString();
};

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
	isOpen,
	projects,
	isLoading,
	onOpenProject,
	onNewProject,
	onDeleteProject,
	onRenameProject,
	onDuplicateProject,
}) => {
	const [query, setQuery] = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("recent");
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState("");

	const visibleProjects = useMemo(() => {
		const q = query.trim().toLowerCase();
		const filtered = q
			? projects.filter((p) => p.name.toLowerCase().includes(q))
			: projects;
		return [...filtered].sort((a, b) =>
			sortKey === "name"
				? a.name.localeCompare(b.name)
				: b.lastModified - a.lastModified
		);
	}, [projects, query, sortKey]);

	if (!isOpen) return null;

	const commitRename = (id: string) => {
		if (renameValue.trim()) onRenameProject(id, renameValue.trim());
		setRenamingId(null);
	};

	return (
		<div className="fixed inset-0 bg-[#1a1a1a] z-50 flex font-[Inter] text-gray-200">
			{/* Sidebar */}
			<div className="w-64 bg-[#252525] border-r border-[#333] flex flex-col p-6">
				<div className="mb-8">
					<img
						src="/logo.svg"
						alt="Logo"
						className="h-10 w-auto object-contain"
					/>
				</div>

				<nav className="space-y-1">
					<button className="w-full text-left px-4 py-2 rounded bg-[#333] text-white font-medium text-sm">
						Home
					</button>
				</nav>

				<div className="mt-auto space-y-3">
					<a
						href="https://github.com/renarin-kholin/Kaadogen"
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs group"
					>
						<GithubIcon className="w-4 h-4 group-hover:text-[#DFFF50]" />
						<span>View on GitHub</span>
					</a>
					<p className="text-[10px] text-gray-600 font-mono">v1.0.0 Beta</p>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="h-16 border-b border-[#333] flex items-center justify-between px-8 gap-4">
					<h1 className="text-lg font-medium text-white shrink-0">Recent</h1>
					<div className="flex items-center gap-3">
						<div className="relative">
							<SearchIcon className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
							<input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search projects"
								className="bg-[#1E1E1E] border border-[#333] rounded text-sm text-gray-200 pl-8 pr-3 py-1.5 w-56 focus:border-[#DFFF50] focus:outline-none placeholder-gray-600"
							/>
						</div>
						<select
							value={sortKey}
							onChange={(e) => setSortKey(e.target.value as SortKey)}
							className="bg-[#1E1E1E] border border-[#333] rounded text-xs text-gray-300 px-2 py-1.5 focus:border-[#DFFF50] focus:outline-none"
						>
							<option value="recent">Last edited</option>
							<option value="name">Name (A–Z)</option>
						</select>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
					<div className="mb-8">
						<button
							onClick={onNewProject}
							className="flex items-center gap-3 bg-[#DFFF50] hover:bg-[#CBE649] text-black px-6 py-3 rounded shadow-lg transition-all transform hover:scale-[1.01]"
						>
							<PlusIcon className="w-5 h-5" />
							<span className="font-medium">New Project</span>
						</button>
					</div>

					{isLoading ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									key={i}
									className="bg-[#252525] border border-[#333] rounded-lg overflow-hidden animate-pulse"
								>
									<div className="aspect-video bg-[#1E1E1E]" />
									<div className="p-4 space-y-2">
										<div className="h-3 bg-[#333] rounded w-2/3" />
										<div className="h-2 bg-[#2C2C2C] rounded w-1/3" />
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{visibleProjects.length === 0 ? (
								<div className="col-span-full text-center py-20 text-gray-500">
									{projects.length === 0 ? (
										<>
											<p>No recent projects found.</p>
											<p className="text-sm mt-2">
												Create a new project to get started.
											</p>
										</>
									) : (
										<p>No projects match “{query}”.</p>
									)}
								</div>
							) : (
								visibleProjects.map((project) => {
									const isConfirming = confirmDeleteId === project.id;
									const isRenaming = renamingId === project.id;
									return (
										<div
											key={project.id}
											className="group bg-[#252525] border border-[#333] rounded-lg hover:border-[#555] transition-all flex flex-col overflow-hidden relative"
										>
											{/* Thumbnail Area (click to open) */}
											<div
												className="aspect-video bg-[#1E1E1E] relative border-b border-[#333] flex items-center justify-center overflow-hidden cursor-pointer"
												onClick={() => onOpenProject(project.id)}
											>
												{project.thumbnail ? (
													<img
														src={project.thumbnail}
														alt={project.name}
														className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
													/>
												) : (
													<FrameIcon className="w-12 h-12 text-gray-600 opacity-20" />
												)}
												<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
											</div>

											{/* Info Area */}
											<div className="p-4">
												<div className="flex items-center justify-between mb-1 gap-2">
													{isRenaming ? (
														<input
															autoFocus
															value={renameValue}
															onChange={(e) => setRenameValue(e.target.value)}
															onBlur={() => commitRename(project.id)}
															onKeyDown={(e) => {
																if (e.key === "Enter") commitRename(project.id);
																if (e.key === "Escape") setRenamingId(null);
															}}
															className="flex-1 bg-[#1E1E1E] text-white text-sm px-1.5 py-0.5 rounded border border-[#DFFF50] outline-none"
														/>
													) : (
														<h3
															className="font-medium text-sm text-gray-200 truncate pr-2 cursor-pointer flex-1"
															title={project.name}
															onClick={() => onOpenProject(project.id)}
														>
															{project.name}
														</h3>
													)}

													{!isRenaming && (
														<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setRenameValue(project.name);
																	setRenamingId(project.id);
																}}
																className="p-1 hover:bg-[#383838] rounded text-gray-500 hover:text-white"
																title="Rename"
															>
																<EditIcon className="w-3.5 h-3.5" />
															</button>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	onDuplicateProject(project.id);
																}}
																className="p-1 hover:bg-[#383838] rounded text-gray-500 hover:text-white"
																title="Duplicate"
															>
																<CopyIcon className="w-3.5 h-3.5" />
															</button>
															<button
																onClick={(e) => {
																	e.stopPropagation();
																	setConfirmDeleteId(project.id);
																}}
																className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-gray-500"
																title="Delete"
															>
																<TrashIcon className="w-3.5 h-3.5" />
															</button>
														</div>
													)}
												</div>
												<p className="text-[11px] text-gray-500">
													Edited {relativeTime(project.lastModified)}
												</p>
											</div>

											{/* Delete confirmation overlay */}
											{isConfirming && (
												<div className="absolute inset-0 bg-[#1E1E1E]/95 flex flex-col items-center justify-center p-4 text-center z-10">
													<p className="text-sm text-gray-200 mb-1 font-medium">
														Delete this project?
													</p>
													<p className="text-[11px] text-gray-500 mb-4 truncate max-w-full">
														“{project.name}” can’t be recovered.
													</p>
													<div className="flex gap-2">
														<button
															onClick={() => setConfirmDeleteId(null)}
															className="px-3 py-1.5 rounded text-xs text-gray-300 hover:text-white bg-[#333]"
														>
															Cancel
														</button>
														<button
															onClick={() => {
																onDeleteProject(project.id);
																setConfirmDeleteId(null);
															}}
															className="px-3 py-1.5 rounded text-xs font-medium text-white bg-red-500/90 hover:bg-red-500"
														>
															Delete
														</button>
													</div>
												</div>
											)}
										</div>
									);
								})
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
