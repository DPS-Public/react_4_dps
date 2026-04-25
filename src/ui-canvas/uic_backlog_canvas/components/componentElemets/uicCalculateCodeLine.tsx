import { Button, Drawer, message, Spin } from "antd";
import { useContext, useState } from "react";
import { IssueContext } from "../../context/issueContext";
import { SaveOutlined, CodeOutlined } from "@ant-design/icons";
import services from "../../services/backlogService";
import { callApiWithToken } from "@/utils/callApi";

export const CalculateCodeLine = ({ checkedRow, setCheckedRow, onTasksUpdated }) => {
    const { calculateCodeLine, setCalculateCodeLine, currentProject, setTasks } = useContext(IssueContext);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        if (!checkedRow || checkedRow.length === 0) {
            message.warning("Please select at least one issue");
            return;
        }

        setLoading(true);
        try {
            const userId = localStorage.getItem("githubId");
            if (!userId) {
                message.error("GitHub user ID not found. Please authenticate with GitHub first.");
                setLoading(false);
                return;
            }

            const userData = JSON.parse(localStorage.getItem("userData") || "{}");
            const uid = userData?.uid || null;

            const results: Array<{ issueId: string; additions: number | null }> = [];

            // First, filter issues to only process closed issues
            const validIssues: Array<{ issueId: string; issue: any }> = [];
            const invalidIssues: string[] = [];

            for (const issueId of checkedRow) {
                try {
                    const issue = await services.getTaskById(currentProject.id, issueId);
                    
                    // Check if issue is closed
                    if (!issue) {
                        invalidIssues.push(issueId);
                        continue;
                    }

                    const isClosed = issue.status === "closed";

                    if (!isClosed) {
                        invalidIssues.push(issueId);
                        continue;
                    }

                    validIssues.push({ issueId, issue });
                } catch (error) {
                    console.error(`Failed to fetch issue ${issueId}:`, error);
                    invalidIssues.push(issueId);
                }
            }

            // Show warning if some issues were filtered out
            if (invalidIssues.length > 0) {
                message.warning(
                    `${invalidIssues.length} issue(s) were skipped because they are not closed. Only closed issues can calculate code lines.`
                );
            }

            if (validIssues.length === 0) {
                message.error("No valid issues found. Please select closed issues.");
                setLoading(false);
                return;
            }

            // Process each valid issue
            for (const { issueId, issue } of validIssues) {
                try {
                    if (!issue?.crdNodeData) {
                        results.push({ issueId, additions: null });
                        continue;
                    }

                    let crdNodeDataFromIssue: any[] = [];
                    try {
                        crdNodeDataFromIssue = JSON.parse(issue.crdNodeData);
                    } catch (e) {
                        console.error('Failed to parse crdNodeData:', e);
                        results.push({ issueId, additions: null });
                        continue;
                    }

                    // Get all repo files (GitHub or external)
                    const repoFiles = crdNodeDataFromIssue.filter((node: any) => 
                        (node.githubRepoFullName && (node.githubPath || node.path)) ||
                        (node.externalRepoFullName && node.externalPath)
                    );

                    if (repoFiles.length === 0) {
                        results.push({ issueId, additions: null });
                        continue;
                    }

                    // Use closedDate if exists, otherwise use current date
                    const targetDate = issue.closedDate && issue.closedDate.trim() !== "" 
                        ? issue.closedDate 
                        : new Date().toISOString().replace("T", " ").slice(0, 19);

                    // Calculate additions for all repo files and sum them
                    let totalAdditions = 0;
                    let firstFileResult: any = null;

                    for (let idx = 0; idx < repoFiles.length; idx++) {
                        const fileNode = repoFiles[idx];
                        const repoFullName = fileNode.githubRepoFullName || fileNode.externalRepoFullName;
                        const filePath = fileNode.githubPath || fileNode.path || fileNode.externalPath;
                        const branch = fileNode.githubBranch || fileNode.externalBranch || 'main';

                        // Validate that we have required fields
                        if (!repoFullName || !filePath) {
                            continue;
                        }

                        try {
                            // Get commits for this file up to the target date
                            const params: any = {
                                userId,
                                uid,
                                repoFullName: repoFullName,
                                path: filePath,
                                branch: branch,
                                all: false,
                                perPage: 1,
                                until: targetDate
                            };

                            const res = await callApiWithToken("/integration-github/repo-file-commits", params);

                            if (res.status === 200 && res.commits && res.commits.length > 0) {
                                const lastCommit = res.commits[0];
                                let fileAdditions: number | null = null;

                                if (lastCommit.files && lastCommit.files.length > 0) {
                                    const fileChange = lastCommit.files.find((f: any) => {
                                        const commitFilePath = f.filename || f.path || '';
                                        const targetPath = filePath;
                                        
                                        if (commitFilePath === targetPath) return true;
                                        if (commitFilePath.endsWith(targetPath)) return true;
                                        
                                        const normalizedFilePath = commitFilePath.replace(/^\/+/, '').replace(/\/+/g, '/');
                                        const normalizedTargetPath = targetPath.replace(/^\/+/, '').replace(/\/+/g, '/');
                                        if (normalizedFilePath === normalizedTargetPath) return true;
                                        
                                        return false;
                                    });

                                    if (fileChange && fileChange.additions !== undefined && fileChange.additions !== null) {
                                        fileAdditions = fileChange.additions;
                                    }
                                } else if (lastCommit.sha) {
                                    try {
                                        const commitDetailsRes = await callApiWithToken("/integration-github/repo-commit-details", {
                                            userId,
                                            uid,
                                            repoFullName: repoFullName,
                                            sha: lastCommit.sha,
                                        });
                                        
                                        if (commitDetailsRes.status === 200 && commitDetailsRes.files) {
                                            const fileChange = commitDetailsRes.files.find((f: any) => {
                                                const commitFilePath = f.filename || f.path || '';
                                                const targetPath = filePath;
                                                return commitFilePath === targetPath || 
                                                       commitFilePath.endsWith(targetPath) ||
                                                       commitFilePath.replace(/^\/+/, '').replace(/\/+/g, '/') === targetPath.replace(/^\/+/, '').replace(/\/+/g, '/');
                                            });
                                            
                                            if (fileChange && fileChange.additions !== undefined && fileChange.additions !== null) {
                                                fileAdditions = fileChange.additions;
                                            }
                                        }
                                    } catch (detailsError) {
                                        console.error(`Failed to get commit details for ${filePath}:`, detailsError);
                                    }
                                }

                                if (fileAdditions !== null) {
                                    totalAdditions += fileAdditions;
                                    
                                    // Store first file result for click handler
                                    if (idx === 0 && !firstFileResult) {
                                        firstFileResult = {
                                            repoFullName,
                                            filePath,
                                            branch,
                                            additions: fileAdditions
                                        };
                                    }
                                }
                            }
                        } catch (fileError) {
                            console.error(`Failed to calculate code line for file ${filePath}:`, fileError);
                        }
                    }
                    
                    const finalAdditions = totalAdditions > 0 ? totalAdditions : null;
                    results.push({ issueId, additions: finalAdditions });
                    
                    // Store first file info in issue for click handler
                    // We'll store it in a custom field or use the existing structure
                    if (firstFileResult && finalAdditions !== null) {
                        // Store first file info in issue metadata (we can extend this later)
                        try {
                            await services.updateCodeLine(currentProject.id, issueId, finalAdditions);
                        } catch (updateError) {
                            console.error(`Failed to update codeLine for issue ${issueId}:`, updateError);
                            message.error(`Failed to save code line for issue ${issueId}`);
                        }
                    } else {
                        try {
                            await services.updateCodeLine(currentProject.id, issueId, null);
                        } catch (updateError) {
                            console.error(`Failed to update codeLine for issue ${issueId}:`, updateError);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to calculate code line for issue ${issueId}:`, error);
                    results.push({ issueId, additions: null });
                    try {
                        await services.updateCodeLine(currentProject.id, issueId, null);
                    } catch (updateError) {
                        console.error(`Failed to update codeLine for issue ${issueId}:`, updateError);
                    }
                }
            }

            const successCount = results.filter(r => r.additions !== null).length;
            message.success(`Code line calculated for ${successCount} out of ${validIssues.length} issue(s)`);
            
            // Refresh tasks to show updated codeLine values
            if (currentProject?.id) {
                try {
                    // Wait a bit to ensure Firestore has updated
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    const updatedTasks = await services.getTasks(currentProject.id);
                    
                    // Create new array references to force React re-render
                    const freshTasks = [...updatedTasks];
                    
                    if (setTasks) {
                        setTasks(freshTasks);
                    }
                    if (onTasksUpdated) {
                        onTasksUpdated(freshTasks);
                    }
                } catch (refreshError) {
                    console.error("Failed to refresh tasks:", refreshError);
                }
            }
            
            setCalculateCodeLine(false);
            setCheckedRow([]);
        } catch (error) {
            console.error("Error calculating code lines:", error);
            message.error("Failed to calculate code lines");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            title={
                <div className="flex items-center gap-2">
                    <CodeOutlined />
                    <span>Calculate Code Line</span>
                </div>
            }
            closable={{ 'aria-label': 'Custom Close Button' }}
            open={calculateCodeLine}
            onClose={() => setCalculateCodeLine(false)}
            footer={[
                <div className="flex items-center gap-1">
                    <Button 
                        onClick={handleCalculate} 
                        type="primary"
                        disabled={loading || !checkedRow || checkedRow.length === 0}
                        icon={<SaveOutlined />}
                    >
                        {loading ? <Spin size="small" /> : "Calculate"}
                    </Button>
                    <Button onClick={() => setCalculateCodeLine(false)} disabled={loading}>
                        Cancel
                    </Button>
                </div>
            ]}
        >
            <div className="space-y-4">
                <p>
                    This will calculate the last addition count for source codes in the selected issues' description details.
                </p>
                <p className="text-gray-600">
                    Selected issues: <strong>{checkedRow?.length || 0}</strong>
                </p>
                {loading && (
                    <div className="text-center">
                        <Spin size="large" />
                        <p className="mt-2">Calculating code lines...</p>
                    </div>
                )}
            </div>
        </Drawer>
    );
};



