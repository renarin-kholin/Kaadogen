import React from "react";
import { ProjectMeta } from "../types";
import { PlusIcon, TrashIcon, FrameIcon, GithubIcon } from "./Icons";

interface ProjectManagerModalProps {
	isOpen: boolean;
	projects: ProjectMeta[];
	onOpenProject: (id: string) => void;
	onNewProject: () => void;
	onDeleteProject: (id: string) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
	isOpen,
	projects,
	onOpenProject,
	onNewProject,
	onDeleteProject,
}) => {
	if (!isOpen) return null;

	const sortedProjects = [...projects].sort(
		(a, b) => b.lastModified - a.lastModified
	);

	return (
		<div className="fixed inset-0 bg-[#1a1a1a] z-50 flex font-[Inter] text-gray-200">
			{/* Sidebar */}
			<div className="w-64 bg-[#252525] border-r border-[#333] flex flex-col p-6">
				<div className="mb-8">
					{/* Placeholder for user SVG Logo */}
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
					<button className="w-full text-left px-4 py-2 rounded hover:bg-[#333] text-gray-400 hover:text-white font-medium text-sm transition-colors">
						Files
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
				<div className="h-16 border-b border-[#333] flex items-center justify-between px-8">
					<h1 className="text-lg font-medium text-white">Recent</h1>
				</div>

				<div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
					{/* Create New Button Section */}
					<div className="mb-8">
						<button
							onClick={onNewProject}
							className="flex items-center gap-3 bg-[#DFFF50] hover:bg-[#CBE649] text-black px-6 py-3 rounded shadow-lg transition-all transform hover:scale-[1.01]"
						>
							<PlusIcon className="w-5 h-5" />
							<span className="font-medium">New Project</span>
						</button>
					</div>

					{/* Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{sortedProjects.length === 0 ? (
							<div className="col-span-full text-center py-20 text-gray-500">
								<p>No recent projects found.</p>
								<p className="text-sm mt-2">
									Create a new project to get started.
								</p>
							</div>
						) : (
							sortedProjects.map((project) => (
								<div
									key={project.id}
									className="group bg-[#252525] border border-[#333] rounded-lg hover:border-[#555] transition-all cursor-pointer flex flex-col overflow-hidden relative"
									onClick={() => onOpenProject(project.id)}
								>
									{/* Thumbnail Area */}
									<div className="aspect-video bg-[#1E1E1E] relative border-b border-[#333] flex items-center justify-center overflow-hidden">
										{project.thumbnail ? (
											<img
												src={project.thumbnail}
												alt={project.name}
												className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
											/>
										) : (
											<FrameIcon className="w-12 h-12 text-gray-600 opacity-20" />
										)}
										{/* Overlay on hover */}
										<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
									</div>

									{/* Info Area */}
									<div className="p-4">
										<div className="flex items-center justify-between mb-1">
											<h3
												className="font-medium text-sm text-gray-200 truncate pr-2"
												title={project.name}
											>
												{project.name}
											</h3>
											<button
												onClick={(e) => {
													e.stopPropagation();
													onDeleteProject(project.id);
												}}
												className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all text-gray-500"
												title="Delete Project"
											>
												<TrashIcon className="w-3.5 h-3.5" />
											</button>
										</div>
										<p className="text-[11px] text-gray-500">
											Edited{" "}
											{new Date(project.lastModified).toLocaleDateString()}
										</p>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
