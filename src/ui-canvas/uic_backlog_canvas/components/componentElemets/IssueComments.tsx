import React, { useEffect, useRef, useState } from "react";
import { Avatar, Button, Divider, message, Spin } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useProjectUsers } from "@/hooks/useProjectUsers";
import { useAppSelector } from "@/store";
import { db } from "@/config/firebase";
import services from "../../services/backlogService";
import UserProfileTooltip from "./uicBacklogCanvasUserProfileTooltip";

interface IssueCommentsProps {
    issue: any;
    currentProject: any;
    onUpdate: () => void;
}

const IssueComments: React.FC<IssueCommentsProps> = ({ issue, currentProject, onUpdate }) => {
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState<boolean>(false);
    const [newComment, setNewComment] = useState<string>("");
    const [savingComment, setSavingComment] = useState<boolean>(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentContent, setEditingCommentContent] = useState<string>("");

    const { projectUsers: users } = useProjectUsers();
    const currentUser = useAppSelector((state: any) => state.auth.currentUser);
    const commentsRef = useRef<any[]>([]);

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image', 'code-block'],
            ['clean']
        ]
    };

    useEffect(() => {
        if (!issue?.id || !currentProject?.id) return;

        // Real-time listener on the issue document
        const docRef = doc(db, `backlog_${currentProject.id}`, issue.id);
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();
            const rawComments = data?.comment;

            let commentsList: any[] = [];
            if (Array.isArray(rawComments)) {
                commentsList = rawComments.map((c: any, index: number) => {
                    if (typeof c === 'string') {
                        return {
                            id: `comment-${index}`,
                            content: c,
                            userName: data?.createdBy || 'Unknown',
                            createdAt: data?.createdAt || new Date(),
                            likes: 0,
                            likedBy: []
                        };
                    }
                    return { id: c.id || `comment-${index}`, likes: 0, likedBy: [], ...c };
                });
            } else if (typeof rawComments === 'string' && rawComments.trim()) {
                commentsList = [{
                    id: 'comment-0',
                    content: rawComments,
                    userName: data?.createdBy || 'Unknown',
                    createdAt: data?.createdAt || new Date(),
                    likes: 0,
                    likedBy: []
                }];
            }

            commentsList.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });

            commentsRef.current = commentsList;
            setComments(commentsList);
            setLoadingComments(false);
        }, () => {
            // fallback to one-time load on error
            loadComments();
        });

        return () => unsubscribe();
    }, [issue?.id, currentProject?.id]);

    const loadComments = async () => {
        if (!issue?.id || !currentProject?.id) return;
        setLoadingComments(true);
        try {
            let commentsList: any[] = [];
            if (issue.comment) {
                if (Array.isArray(issue.comment)) {
                    commentsList = issue.comment.map((comment: any, index: number) => {
                        if (typeof comment === 'string') {
                            return {
                                id: `comment-${index}-${Date.now()}`,
                                content: comment,
                                userName: issue.createdBy || 'Unknown',
                                createdAt: issue.createdAt || new Date(),
                                likes: 0,
                                likedBy: []
                            };
                        }

                        return {
                            id: comment.id || `comment-${index}-${Date.now()}`,
                            likes: comment.likes || 0,
                            likedBy: comment.likedBy || [],
                            emoji: comment.emoji || null,
                            ...comment
                        };
                    });
                } else if (typeof issue.comment === 'string') {
                    commentsList = [{
                        id: `comment-0-${Date.now()}`,
                        content: issue.comment,
                        userName: issue.createdBy || 'Unknown',
                        createdAt: issue.createdAt || new Date(),
                        likes: 0,
                        likedBy: []
                    }];
                }
            }
            commentsList.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });
            setComments(commentsList);
        } catch (error) {
            message.error("Failed to load comments");
        } finally {
            setLoadingComments(false);
        }
    };

    const handleSaveComment = async () => {
        if (!newComment.trim()) {
            message.warning("Comment cannot be empty");
            return;
        }

        if (!issue?.id || !currentProject?.id || !currentUser) {
            message.warning("Please login to add comments");
            return;
        }
        setSavingComment(true);
        try {

            const newCommentObj: any = {
                id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                content: newComment,
                userId: currentUser.uid,
                userName: currentUser.displayName || currentUser.email,
                userPhoto: currentUser.photoURL || null,
                createdAt: Timestamp.now(),
                likes: 0,
                likedBy: []
            };

            // Use the ref (always fresh from onSnapshot) instead of stale issue prop
            const commentsArray = [...commentsRef.current, newCommentObj];
            await services.editComment(
                currentProject.id, 
                issue.id, 
                commentsArray,
                currentUser.uid,
                currentUser.displayName || currentUser.email
            );
            
            // onSnapshot will update comments state automatically; just clear the input
            setNewComment("");
            onUpdate();
            message.success("Comment added successfully");
        } catch (error) {
            message.error("Failed to save comment");
        } finally {
            setSavingComment(false);
        }
    };

    const handleEdit = (comment: any) => {
        setEditingCommentId(comment.id);
        setEditingCommentContent(comment.content);
    };

    const handleSaveEdit = async () => {
        if (!editingCommentId || !editingCommentContent.trim()) {
            message.warning("Comment cannot be empty");
            return;
        }

        if (!currentUser?.uid) {
            message.warning("Please login to edit comments");
            return;
        }

        try {
            const updatedComments: any = comments.map((comment: any) => {
                if (comment.id === editingCommentId) {
                    return {
                        ...comment,
                        content: editingCommentContent,
                        editedAt: Timestamp.now(),
                        editedBy: currentUser.uid
                    };
                }
                return comment;
            });

            await services.editComment(
                currentProject.id,
                issue.id,
                updatedComments,
                currentUser.uid,
                currentUser.displayName || currentUser.email
            );
            setComments(updatedComments);
            setEditingCommentId(null);
            setEditingCommentContent("");
            message.success("Comment updated successfully");
            onUpdate();
        } catch (error) {
            message.error("Failed to update comment");
        }
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditingCommentContent("");
    };

    const getInitials = (name: string) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-4">
            <div>
                <div className="text-sm font-semibold mb-2">
                    Add Comment
                </div>
                <div className="bg-white border rounded">
                    <ReactQuill
                        theme="snow"
                        value={newComment}
                        onChange={setNewComment}
                        placeholder="Write "
                        modules={quillModules}
                        style={{ minHeight: '0px' }}
                    />
                </div>
                <div className="flex gap-2 mt-4">
                    <Button
                        type="primary"
                        onClick={handleSaveComment}
                        loading={savingComment}
                        disabled={!newComment.trim()}
                    >
                        Save
                    </Button>
                    <Button onClick={() => {
                        setNewComment("");
                    }}>
                        Cancel
                    </Button>
                </div>
            </div>
            <Divider />
            <div>
                <div className="text-sm font-semibold mb-4">Comments</div>
                {loadingComments ? (
                    <div className="text-center py-8">
                        <Spin />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No comments yet
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment: any) => {
                            const commentUser: any = users?.find((u: any) => u.uid === comment.userId);
                            return (
                                <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-0">
                                    <UserProfileTooltip user={commentUser || { displayName: comment.userName, email: '', photoURL: comment.userPhoto }}>
                                        <Avatar
                                            src={comment.userPhoto || commentUser?.photoURL}
                                            style={{ backgroundColor: '#1890ff' }}
                                        >
                                            {!comment.userPhoto && !commentUser?.photoURL && getInitials(comment.userName || '')}
                                        </Avatar>
                                    </UserProfileTooltip>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{comment.userName || 'Unknown User'}</span>
                                            <span className="text-xs text-gray-500">
                                                {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'Recently'}
                                            </span>
                                            {comment.editedAt && (
                                                <span className="text-xs text-gray-400">(edited)</span>
                                            )}
                                        </div>
                                        {editingCommentId === comment.id ? (
                                            <div className="space-y-2">
                                                <div className="bg-white border rounded">
                                                    <ReactQuill
                                                        theme="snow"
                                                        value={editingCommentContent}
                                                        onChange={setEditingCommentContent}
                                                        modules={quillModules}
                                                        style={{ minHeight: '100px' }}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="primary"
                                                        size="small"
                                                        onClick={handleSaveEdit}
                                                        disabled={!editingCommentContent.trim()}
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button size="small" onClick={handleCancelEdit}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-2">
                                                    <div
                                                        className="text-sm"
                                                        dangerouslySetInnerHTML={{ __html: comment.content }}
                                                    />
                                                    {comment?.emoji && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-2xl">{comment.emoji}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 mt-2">
                                                    {comment.userId === currentUser?.uid && (
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<EditOutlined />}
                                                            onClick={() => handleEdit(comment)}
                                                        >
                                                            Edit
                                                        </Button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IssueComments;
